// Demo / starter data. Everything marked "to be confirmed" or "sample" is placeholder
// content that the college must replace through the admin panel.
// Safe by default: does nothing if the database already has data, unless SEED_FORCE=1.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { normalize } = require('../src/services/textService');
const { sqlNow } = require('../src/services/dates');

const TABLES_IN_DELETE_ORDER = [
  'sabari_settings', 'sabari_unanswered', 'sabari_messages', 'sabari_conversations', 'sabari_knowledge',
  'sabari_quick_replies', 'sabari_keywords', 'sabari_faq_translations', 'sabari_faqs', 'sabari_categories',
  'audit_logs', 'settings', 'banners', 'news', 'pages', 'users', 'role_permissions', 'permissions', 'roles',
  'programmes', 'departments', 'academic_years',
];

const PLACEHOLDER = (what) => `<p class="placeholder-note">This section is ready for the college's official content: ${what}. ` +
  'An administrator can edit it from <strong>Admin → Pages</strong>.</p>';

exports.seed = async function (knex) {
  const existing = await knex('settings').first();
  if (existing && process.env.SEED_FORCE !== '1') {
    console.log('Seed skipped: database already has data. Set SEED_FORCE=1 to wipe and reseed.');
    return;
  }
  for (const t of TABLES_IN_DELETE_ORDER) await knex(t).del();

  // ---- Institution ----
  await knex('settings').insert([
    { setting_key: 'college_name', setting_value: 'Sree Sabareesa College' },
    { setting_key: 'college_name_ml', setting_value: 'ശ്രീ ശബരീശ കോളേജ്' },
    { setting_key: 'tagline', setting_value: 'Knowledge · Character · Service (sample tagline)' },
    { setting_key: 'affiliation', setting_value: 'Affiliated college (university to be confirmed)' },
    { setting_key: 'address', setting_value: 'Murikkumvayal, Mundakkayam, Kottayam District, Kerala (to be confirmed)' },
    { setting_key: 'phone', setting_value: 'To be added' },
    { setting_key: 'email', setting_value: 'To be added' },
    { setting_key: 'office_hours', setting_value: 'Monday to Saturday, 9:30 AM to 4:30 PM (to be confirmed)' },
    { setting_key: 'map_url', setting_value: '' },
    { setting_key: 'institution_mode', setting_value: 'affiliated' }, // affiliated | autonomous
  ]);

  const [ayId] = await knex('academic_years').insert({ label: '2026-27', start_date: '2026-06-01', end_date: '2027-03-31', is_current: true });
  const academicYearId = typeof ayId === 'object' ? ayId.id : ayId;

  const departments = [
    { name: 'Department of English', slug: 'english', short_name: 'English', ml: 'ഇംഗ്ലീഷ്' },
    { name: 'Department of Malayalam', slug: 'malayalam', short_name: 'Malayalam', ml: 'മലയാളം' },
    { name: 'Department of Commerce', slug: 'commerce', short_name: 'Commerce', ml: 'കൊമേഴ്സ്' },
    { name: 'Department of Computer Science', slug: 'computer-science', short_name: 'Computer Science', ml: 'കമ്പ്യൂട്ടർ സയൻസ്' },
  ];
  const deptIds = {};
  let order = 1;
  for (const d of departments) {
    const [id] = await knex('departments').insert({
      name: d.name, slug: d.slug, short_name: d.short_name, sort_order: order++,
      description: `Sample department. Replace with the official profile of the ${d.name}.`,
      hod_name: 'To be added',
    });
    deptIds[d.slug] = typeof id === 'object' ? id.id : id;
  }

  await knex('programmes').insert([
    { department_id: deptIds.english, name: 'BA English (sample)', slug: 'ba-english', level: 'UG', duration: '3 / 4 years', sort_order: 1 },
    { department_id: deptIds.malayalam, name: 'BA Malayalam (sample)', slug: 'ba-malayalam', level: 'UG', duration: '3 / 4 years', sort_order: 2 },
    { department_id: deptIds.commerce, name: 'B.Com (sample)', slug: 'bcom', level: 'UG', duration: '3 / 4 years', sort_order: 3 },
    { department_id: deptIds['computer-science'], name: 'BSc Computer Science (sample)', slug: 'bsc-computer-science', level: 'UG', duration: '3 / 4 years', sort_order: 4 },
  ].map((p) => ({ ...p, description: 'Sample programme. Replace with the official eligibility, syllabus and intake.' })));

  // ---- RBAC ----
  const roles = [
    ['super_admin', 'Super Admin', 'Complete system access'],
    ['principal', 'Principal', 'Institutional dashboard, approvals and reports'],
    ['iqac_coordinator', 'IQAC Coordinator', 'NAAC data, verification and reports'],
    ['hod', 'Head of Department', 'Department content and verification'],
    ['dept_coordinator', 'Department Coordinator', 'Assigned department content'],
    ['website_admin', 'Website Administrator', 'Pages, news, banners and Sabari'],
    ['office_admin', 'Office Administrator', 'Staff and student records, account verification'],
    ['faculty', 'Teaching Faculty', 'Own profile and submissions'],
    ['staff', 'Non-Teaching Staff', 'Own profile'],
    ['student', 'Student', 'Own profile and achievements'],
  ];
  await knex('roles').insert(roles.map(([code, name, description]) => ({ code, name, description })));
  const permissions = [
    ['cms.pages', 'Manage pages and menus'],
    ['cms.news', 'Manage news, events and notices'],
    ['cms.banners', 'Manage homepage banners'],
    ['institution.departments', 'Manage departments and programmes'],
    ['settings.manage', 'Edit college information and settings'],
    ['users.manage', 'Create users and assign roles'],
    ['users.approve', 'Approve or reject registrations'],
    ['audit.view', 'View audit logs'],
    ['reports.view', 'View institutional reports'],
    ['sabari.manage', 'Manage Sabari FAQs and review questions'],
    ['iqac.manage', 'Manage IQAC / NAAC data'],
  ];
  await knex('permissions').insert(permissions.map(([code, name]) => ({ code, name })));
  const roleRows = await knex('roles').select('id', 'code');
  const permRows = await knex('permissions').select('id', 'code');
  const grant = {
    super_admin: permissions.map((p) => p[0]),
    principal: ['reports.view', 'audit.view', 'users.approve'],
    iqac_coordinator: ['iqac.manage', 'reports.view'],
    website_admin: ['cms.pages', 'cms.news', 'cms.banners', 'institution.departments', 'settings.manage', 'sabari.manage'],
    office_admin: ['users.approve'],
  };
  const rp = [];
  for (const [roleCode, perms] of Object.entries(grant)) {
    const role = roleRows.find((r) => r.code === roleCode);
    for (const pc of perms) rp.push({ role_id: role.id, permission_id: permRows.find((p) => p.code === pc).id });
  }
  await knex('role_permissions').insert(rp);

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const [adminId] = await knex('users').insert({
    full_name: 'Super Admin', email: adminEmail, user_type: 'admin', status: 'approved',
    password_hash: await bcrypt.hash(adminPassword, 12),
    role_id: roleRows.find((r) => r.code === 'super_admin').id,
  });
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`\n  Super Admin created: ${adminEmail}\n  Temporary password: ${adminPassword}\n  Change it after first login.\n`);
  }

  // ---- CMS pages (public website structure from the blueprint) ----
  const pages = [
    ['About the College', 'about', 'about', 1, 'the college history, vision, mission and core values'],
    ['Management and Administration', 'management', 'about', 2, 'the management, principal and administrative offices'],
    ['Infrastructure and Facilities', 'infrastructure', 'about', 3, 'classrooms, laboratories, hostels, sports and other facilities'],
    ['Library', 'library', 'about', 4, 'library collection, timings, e-resources and rules'],
    ['Faculty and Staff Directory', 'faculty-directory', 'academics', 3, 'the faculty and staff directory (filled automatically from the Faculty Portal in Phase 4)'],
    ['Research and Publications', 'research', 'academics', 4, 'research centres, publications and projects'],
    ['Admissions', 'admissions', null, 1, 'eligibility, application process, important dates, fees and admission FAQs'],
    ['IQAC', 'iqac', 'iqac', 1, 'IQAC composition, meetings, minutes and AQAR reports'],
    ['NAAC', 'naac', 'iqac', 2, 'NAAC accreditation status, SSR and criterion-wise documents'],
    ['Committees and Cells', 'committees', 'iqac', 3, 'statutory and non-statutory committees and cells'],
    ['Mandatory Disclosures', 'mandatory-disclosures', 'iqac', 4, 'mandatory disclosures required by regulatory bodies'],
    ['Student Achievements', 'student-achievements', 'campus', 1, 'verified student achievements (filled from the Student Portal in Phase 5)'],
    ['NSS and Extension Activities', 'nss', 'campus', 2, 'NSS units, extension and outreach activities'],
    ['Alumni', 'alumni', 'campus', 4, 'the alumni association, notable alumni and alumni registration'],
  ];
  await knex('pages').insert(pages.map(([title, slug, group, menuOrder, what]) => ({
    title, slug, menu_group: group, menu_order: menuOrder, show_in_menu: true, status: 'published',
    summary: `Official information about ${what}.`, body: PLACEHOLDER(what), updated_by: typeof adminId === 'object' ? adminId.id : adminId,
  })));

  // ---- News, events, notices (sample) ----
  const nowDate = new Date();
  const now = sqlNow(nowDate);
  const iso = (d) => d.toISOString().slice(0, 10);
  await knex('news').insert([
    { type: 'notice', title: 'Sample notice: admissions information for 2026-27', slug: 'sample-admissions-notice-2026-27', summary: 'Replace this sample notice with the official admission notification.', body: '<p>This is sample content for the demo.</p>', status: 'published', is_featured: true, published_at: now, academic_year_id: academicYearId },
    { type: 'event', title: 'Sample event: inter-departmental seminar', slug: 'sample-seminar', summary: 'An example event to show how events appear on the website.', body: '<p>This is sample content for the demo.</p>', event_date: iso(new Date(nowDate.getTime() + 14 * 864e5)), status: 'published', is_featured: false, published_at: now, academic_year_id: academicYearId, department_id: deptIds.english },
    { type: 'news', title: 'Sample news: new website and Sabari assistant', slug: 'sample-new-website', summary: 'The college is preparing a new website with Sabari, a bilingual virtual assistant.', body: '<p>This is sample content for the demo.</p>', status: 'published', is_featured: true, published_at: now, academic_year_id: academicYearId },
  ]);

  await knex('banners').insert([
    { title: 'Welcome to Sree Sabareesa College', subtitle: 'Sample banner. Upload the official message and photos from Admin → Banners.', link_url: '/about', link_label: 'About the college', sort_order: 1 },
  ]);

  // ---- Sabari ----
  await knex('sabari_settings').insert([
    ['enabled', '1'],
    ['assistant_title', 'Sree Sabareesa College Virtual Assistant'],
    ['welcome_en', "Hello! Welcome to Sree Sabareesa College. I'm Sabari, your virtual assistant. I can help you find information about our college. How can I help you?"],
    ['welcome_ml', 'നമസ്കാരം! ശ്രീ ശബരീശ കോളേജിലേക്ക് സ്വാഗതം. ഞാൻ ശബരി, നിങ്ങളുടെ വെർച്വൽ അസിസ്റ്റന്റാണ്. കോളേജുമായി ബന്ധപ്പെട്ട വിവരങ്ങൾ അറിയാൻ ഞാൻ സഹായിക്കാം.'],
    ['fallback_en', "Sorry, I couldn't find a verified answer to your question. You can contact the college directly or submit your question. Our team can review it."],
    ['fallback_ml', 'ക്ഷമിക്കണം, നിങ്ങളുടെ ചോദ്യത്തിന് സ്ഥിരീകരിച്ച ഉത്തരം കണ്ടെത്താനായില്ല. കോളേജുമായി നേരിട്ട് ബന്ധപ്പെടുകയോ നിങ്ങളുടെ ചോദ്യം സമർപ്പിക്കുകയോ ചെയ്യാം.'],
    ['submitted_en', 'Thank you. Your question has been submitted for review by the college team.'],
    ['submitted_ml', 'നന്ദി. നിങ്ങളുടെ ചോദ്യം കോളേജ് ടീമിന്റെ പരിശോധനയ്ക്കായി സമർപ്പിച്ചു.'],
    ['match_threshold', '1'],
    ['chat_retention_days', '90'],
  ].map(([setting_key, setting_value]) => ({ setting_key, setting_value })));

  const categories = [
    ['admissions', 'Admissions', 'പ്രവേശനം', '🎓', '/admissions'],
    ['courses', 'Courses and Programmes', 'കോഴ്സുകൾ', '📚', '/programmes'],
    ['departments', 'Departments', 'വകുപ്പുകൾ', '🏛️', '/departments'],
    ['faculty', 'Faculty & Staff', 'അധ്യാപകരും ജീവനക്കാരും', '👩‍🏫', '/faculty-directory'],
    ['news', 'News & Events', 'വാർത്തകളും പരിപാടികളും', '📰', '/news'],
    ['contact', 'Contact Us', 'ബന്ധപ്പെടുക', '📞', '/contact'],
  ];
  await knex('sabari_categories').insert(categories.map(([code, name, name_ml, icon, page_url], i) => ({ code, name, name_ml, icon, page_url, sort_order: i + 1 })));
  const cat = Object.fromEntries((await knex('sabari_categories').select('id', 'code')).map((c) => [c.code, c.id]));

  // [category, source_url, en question, en answer, ml question, ml answer, en keywords, ml keywords, quickReply]
  const faqs = [
    ['admissions', '/admissions',
      'How can I apply for admission?', 'Eligibility, the application process and important dates are published on the Admissions page. For help, you can contact the college office.',
      'അഡ്മിഷൻ എങ്ങനെ ലഭിക്കും?', 'പ്രവേശന യോഗ്യത, അപേക്ഷിക്കേണ്ട രീതി, പ്രധാന തീയതികൾ എന്നിവ അഡ്മിഷൻ പേജിൽ ലഭ്യമാണ്. കൂടുതൽ സഹായത്തിന് കോളേജ് ഓഫീസുമായി ബന്ധപ്പെടാം.',
      ['admission', 'apply', 'application', 'join', 'eligibility', 'enrol', 'enroll'], ['അഡ്മിഷ', 'പ്രവേശന', 'അപേക്ഷ', 'ചേര'], true],
    ['courses', '/programmes',
      'What courses are available?', 'You can see every programme offered by the college, with its department and duration, on the Programmes page.',
      'കോളേജിൽ ഏതൊക്കെ കോഴ്സുകളുണ്ട്?', 'കോളേജിൽ ലഭ്യമായ എല്ലാ കോഴ്സുകളും അവയുടെ വകുപ്പും കാലാവധിയും പ്രോഗ്രാമുകൾ പേജിൽ കാണാം.',
      ['course', 'programme', 'program', 'degree', 'ug', 'pg', 'subject'], ['കോഴ്സ', 'പ്രോഗ്രാം', 'ഡിഗ്രി', 'ബിരുദ'], true],
    ['departments', '/departments',
      'Which departments are there?', 'You can see every department, with its programmes and head of department, on the Departments page.',
      'കോളേജിൽ ഏതൊക്കെ വകുപ്പുകളുണ്ട്?', 'എല്ലാ വകുപ്പുകളും അവയുടെ കോഴ്സുകളും വകുപ്പ് മേധാവികളും വകുപ്പുകൾ പേജിൽ കാണാം.',
      ['department', 'dept', 'hod', 'head of department'], ['വകുപ്പ', 'ഡിപ്പാർട്ട്മെ', 'മേധാവി'], true],
    ['faculty', '/faculty-directory',
      'Where can I find faculty details?', 'Details of teaching and non-teaching staff are available in the Faculty and Staff Directory.',
      'അധ്യാപകരുടെ വിവരങ്ങൾ എവിടെ ലഭിക്കും?', 'അധ്യാപകരുടെയും അനധ്യാപക ജീവനക്കാരുടെയും വിവരങ്ങൾ ഫാക്കൽറ്റി ആൻഡ് സ്റ്റാഫ് ഡയറക്ടറിയിൽ ലഭ്യമാണ്.',
      ['faculty', 'teacher', 'staff', 'professor', 'lecturer'], ['അധ്യാപക', 'ടീച്ചർ', 'ജീവനക്കാ', 'ഫാക്കൽറ്റി'], true],
    ['news', '/news',
      'What are the latest news and events?', 'The latest news, events and notices are on the News & Events page.',
      'പുതിയ വാർത്തകളും പരിപാടികളും എന്തൊക്കെയാണ്?', 'പുതിയ വാർത്തകളും പരിപാടികളും അറിയിപ്പുകളും വാർത്തകൾ പേജിൽ കാണാം.',
      ['news', 'event', 'notice', 'announcement', 'latest', 'upcoming'], ['വാർത്ത', 'പരിപാടി', 'അറിയിപ്പ'], true],
    ['contact', '/contact',
      'Where is the college located?', 'The college is located at: {{address}}.',
      'കോളേജ് എവിടെയാണ്?', 'കോളേജിന്റെ വിലാസം: {{address}}.',
      ['located', 'location', 'address', 'where college', 'reach', 'direction', 'map'], ['എവിടെ', 'വിലാസ', 'സ്ഥലം', 'ലൊക്കേഷ'], true],
    ['contact', '/contact',
      'How can I contact the college?', 'Phone: {{phone}}. Email: {{email}}. Office hours: {{office_hours}}.',
      'കോളേജുമായി എങ്ങനെ ബന്ധപ്പെടാം?', 'ഫോൺ: {{phone}}. ഇമെയിൽ: {{email}}. ഓഫീസ് സമയം: {{office_hours}}.',
      ['contact', 'phone', 'email', 'number', 'call', 'mobile', 'office hour'], ['ഫോൺ', 'ബന്ധപ്പെ', 'നമ്പർ', 'ഇമെയിൽ', 'ഓഫീസ്'], true],
    [null, '/',
      'Who are you?', "I'm Sabari, the virtual assistant of Sree Sabareesa College. I answer only from information the college has verified.",
      'നിങ്ങൾ ആരാണ്?', 'ഞാൻ ശബരി, ശ്രീ ശബരീശ കോളേജിന്റെ വെർച്വൽ അസിസ്റ്റന്റാണ്. കോളേജ് സ്ഥിരീകരിച്ച വിവരങ്ങളിൽ നിന്ന് മാത്രമാണ് ഞാൻ മറുപടി നൽകുന്നത്.',
      ['who are you', 'what is sabari', 'your name'], ['ആരാണ്', 'ശബരി', 'പേര്'], false],
  ];

  // Department-specific HOD questions, e.g. "Who is the HOD of English?"
  for (const d of departments) {
    faqs.push(['departments', `/departments/${d.slug}`,
      `Who is the HOD of ${d.short_name}?`, `Details of the Head of the ${d.name} are on the ${d.short_name} department page.`,
      `${d.ml} വകുപ്പിന്റെ മേധാവി ആരാണ്?`, `${d.ml} വകുപ്പ് മേധാവിയുടെ വിവരങ്ങൾ ${d.ml} വകുപ്പിന്റെ പേജിൽ ലഭ്യമാണ്.`,
      [`hod ${d.short_name}`, `head ${d.short_name}`, `${d.short_name} department`], [`${d.ml} മേധാവി`, `${d.ml} വകുപ്പ`], false]);
  }

  let priority = 0;
  for (const [code, sourceUrl, qEn, aEn, qMl, aMl, kEn, kMl, quick] of faqs) {
    const [fid] = await knex('sabari_faqs').insert({ category_id: code ? cat[code] : null, source_url: sourceUrl, status: 'published', priority: priority-- });
    const faqId = typeof fid === 'object' ? fid.id : fid;
    await knex('sabari_faq_translations').insert([
      { faq_id: faqId, language: 'en', question: qEn, answer: aEn },
      { faq_id: faqId, language: 'ml', question: qMl, answer: aMl },
    ]);
    await knex('sabari_keywords').insert([
      ...kEn.map((k) => ({ faq_id: faqId, language: 'en', keyword: normalize(k) })),
      ...kMl.map((k) => ({ faq_id: faqId, language: 'ml', keyword: normalize(k) })),
    ]);
    if (quick && code) {
      await knex('sabari_quick_replies').insert([
        { category_id: cat[code], faq_id: faqId, language: 'en', label: qEn, sort_order: 1 },
        { category_id: cat[code], faq_id: faqId, language: 'ml', label: qMl, sort_order: 1 },
      ]);
    }
  }
};
