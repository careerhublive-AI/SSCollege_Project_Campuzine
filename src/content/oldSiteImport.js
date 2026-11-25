// Content imported from the college's previous WordPress site (www.sreesabareesacollege.in),
// from a saved copy provided by the college on 2026-11-25.
//
// Safety rules:
// - Runs once (marked by the setting "content_import" = "wp-2026-11-25").
// - Only replaces rows that still hold the original sample/placeholder content, so anything an
//   administrator has already edited in the admin panel is left untouched.

const { normalize } = require('../services/textService');
const { sqlNow } = require('../services/dates');

const MARK = 'wp-2026-11-25';
const idOf = (r) => (typeof r === 'object' && r !== null ? r.id : r);

const SETTINGS = {
  college_name: 'Sree Sabareesa College',
  college_name_ml: 'ശ്രീ ശബരീശ കോളേജ്',
  tagline: "India's first Government-aided Arts & Science College run by tribal management",
  affiliation: 'Affiliated to Mahatma Gandhi University, Kottayam · Approved by AICTE, New Delhi',
  address: 'Murikkumvayal, Karinilam P.O, Mundakayam, Kottayam District, Kerala',
  phone: '04828 278560',
  admission_phone: '9496180154, 7025895721, 04828 299758',
  email: 'sreesabareesacollege@gmail.com',
  office_hours: '',
  facebook_url: 'https://www.facebook.com/share/1ARgggbLMX/',
};
// Only overwrite a setting if it still has its sample value (or is missing).
const SAMPLE_SETTING = /(to be confirmed|to be added|sample tagline)/i;

const DEPARTMENTS = [
  {
    slug: 'english', name: 'Department of English', short_name: 'English', ml: 'ഇംഗ്ലീഷ്', hod_name: 'Ms. Nowfiya Nazeer P.N',
    description: 'The Department of English offers a B.A. English (Honours) programme with specialisations in Cultural Studies and Media Studies, giving students a strong foundation in literature, language and contemporary cultural discourse. The career-oriented curriculum is delivered by experienced faculty who emphasise academic excellence, personal mentorship and real-world learning. Collaborations and MoUs with international universities give students global academic exposure, and complementary courses are offered in Malayalam, Hindi and Sociology.\n\nStudents take part in literary and theatre clubs, research and publication opportunities, skill-development workshops and placement support. Laurelite, the English Association, runs literary festivals, debates, public speaking forums, theatre performances, creative writing workshops and dialogues on cultural heritage.',
    faculty_text: 'Ms. Nowfiya Nazeer P.N | Assistant Professor & Head of Department\nMs. Sarithamol K.P | Assistant Professor\nMs. Vani Maria Jose | Assistant Professor\nMs. Salma M | Assistant Professor',
    sort_order: 1,
  },
  {
    slug: 'commerce', name: 'Department of Commerce', short_name: 'Commerce', ml: 'കൊമേഴ്സ്', hod_name: 'Mr. Arun K Balan',
    description: 'The Department of Commerce offers an industry-relevant B.Com (Honours) programme in two batches, with specialisations in Finance & Taxation and Marketing, and in Accounting and Logistics Management. The programme is integrated with ACCA / CMA coaching, giving students globally recognised professional qualifications. Students benefit from internships in financial institutions, add-on courses, regular placement drives and industrial visits, supported by an active career guidance cell and the Commerce Association.\n\nThe college has a Rural Entrepreneurship Development Cell and is a member of the National Rural Entrepreneurship Mission, Mahatma Gandhi National Council of Rural Education, Ministry of Education, Government of India.',
    faculty_text: 'Mr. Arun K Balan | Assistant Professor & Head of Department\nMrs. Bhagyasree R | Assistant Professor\nDr. Diya Usman | Assistant Professor\nMr. Arun Nath T.P | Assistant Professor on Contract\nMs. Anusha K J | Assistant Professor on Contract\nMs. Anjumol Sasi | Assistant Professor on Contract\nDr. Roopa Revathy R | Assistant Professor on Contract',
    sort_order: 2,
  },
  {
    slug: 'computer-applications', name: 'Department of Computer Applications', short_name: 'Computer Applications', ml: 'കമ്പ്യൂട്ടർ ആപ്ലിക്കേഷൻസ്', hod_name: 'Mr. Akhiljith B',
    description: 'The Department of Computer Applications offers an AICTE-approved, Government-aided BCA (Honours) programme with specialisations in Artificial Intelligence & Machine Learning and Data Science, taught by UGC-NET qualified faculty. Facilities include a well-equipped computer lab and the Center for Research in Android Programming (CRAP), with institutional memberships of Kerala Blockchain Academy, ICFOSS and ICT Academy of Kerala, and an MoU with CELK, University of Kerala.\n\nGOOGOL, the Computer Association (established 2019), runs workshops, seminars and AAVISHKAAR, the department\'s national-level tech fest. The department also hosts the FOSS Cell and the Kerala Blockchain Academy Innovation Council (KBAIC).',
    faculty_text: 'Mr. Akhiljith B | Assistant Professor & Head of Department\nMs. Prajitha K | Assistant Professor\nMs. Faimina B S | Assistant Professor\nMs. Jyothy Raj V | Assistant Professor\nMs. Surya M | Assistant Professor\nMs. Neenu Sagar | Assistant Professor on Contract',
    sort_order: 3,
  },
  {
    slug: 'social-work', name: 'PG Department of Social Work', short_name: 'Social Work', ml: 'സോഷ്യൽ വർക്ക്', hod_name: 'Ms. Beevimol Assis',
    description: 'The Post Graduate Department of Social Work offers the Government-aided Master of Social Work (MSW) programme, with specialisations in Medical & Psychiatric Social Work, Family & Child Welfare, Community Development and Tribal Social Work. Its mission is to build scientific social work knowledge, ethics, principles and skills through innovative teaching, with a focus on quality education, social work research and community extension. The department is a member of the International Association of Schools of Social Work (IASSW).\n\nInitiatives include an International Students Office (coordinator: Ms. Beevimol Assis), an Inter State Students Office (coordinator: Ms. Neeraja Raj), the MSW Virtual Classroom with international faculty (coordinator: Mr. Jijish M), and the Community Extension Centre for tribal communities. Add-on courses: Certificate in Community Development, Certificate in Counselling Psychology and Diploma in Counselling Psychology. Academic and research MoUs: International Justice Mission and State Resource Center.',
    faculty_text: 'Ms. Beevimol Assis | Assistant Professor & Head of Department\nMr. Jijish M | Assistant Professor & Principal in-charge\nMr. Harishkumar V G | Assistant Professor',
    sort_order: 4,
  },
];

const PROGRAMMES = [
  { dept: 'english', name: 'BA English (Honours)', slug: 'ba-english-honours', level: 'UG', intake: 30,
    description: 'Government-aided. Specialisations: Cultural Studies, Media Studies.' },
  { dept: 'commerce', name: 'B.Com (Honours), Batch 1', slug: 'bcom-honours-batch-1', level: 'UG', intake: 40,
    description: 'Government-aided. Specialisations: Finance & Taxation, Marketing. Integrated with ACCA / CMA coaching.' },
  { dept: 'commerce', name: 'B.Com (Honours), Batch 2', slug: 'bcom-honours-batch-2', level: 'UG', intake: 40,
    description: 'Government-aided. Specialisations: Accounting, Logistics Management. Integrated with ACCA / CMA coaching.' },
  { dept: 'computer-applications', name: 'BCA (Honours)', slug: 'bca-honours', level: 'UG', intake: 30,
    description: 'Government-aided, AICTE approved. Specialisations: Artificial Intelligence & Machine Learning, Data Science.' },
  { dept: 'social-work', name: 'Master of Social Work (MSW)', slug: 'msw', level: 'PG', intake: null,
    description: 'Government-aided. Specialisations: Medical & Psychiatric Social Work, Family & Child Welfare, Community Development, Tribal Social Work.' },
];

const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

const PAGES = {
  about: {
    summary: "India's first Government-aided Arts & Science College run by tribal management, established in 2017.",
    body: `<h2>The revival of a noble tradition</h2>
<p>Sree Sabareesa College, Murikkumvayal, is situated in the central part of Kerala on the border of Kottayam and Idukki districts. Established in 2017, it is considered India's first aided Arts and Science College run by tribal management. The college is governed by the Mala Araya Educational Trust (MET) under its mother organisation, the Aikya Mala Araya Maha Sabha (AMAMS), a welfare organisation working with the Mala Araya tribal population of Kerala.</p>
<p>The college was established to reinstate knowledge and rebuild the academic environment of the Indian tribal community through quality higher education combined with tribal culture, multiple skill development, socio-political mainstreaming and self-actualisation. After a long period of social movements, the leaders of AMAMS held a round-table discussion and decided to establish higher education institutions across India wherever tribal people live. Sree Sabareesa College was founded in 2017 from that long-term vision.</p>
<h2>Vision</h2>
<p>To rebuild the auspicious academic environment of Indian tribal community through quality higher education incorporated with tribal culture, multiple skill emancipation, socio-political mainstreaming and self-actualization.</p>
<h2>Mission</h2>
<p>To establish higher educational institutions all over India where tribal people live and ensure access to quality education and development of international facilities.</p>
<h2>The Mala Araya community</h2>
<p>The Mala Araya are a Scheduled Tribe recognised by the Government of India. They worship Lord Ayyappa (Sree Sabareesa) and the Mala Daivangal (hill deities). The name Mala Arayan (Mala Arachan) means "king of the hills", and the community follows traditional beliefs and strong moral values. Ivarkali and Kolkali are their two traditional dance forms.</p>
<p>The community traditionally inhabits the 18 holy hills of southern Kerala, spread over Kottayam, Idukki and Pathanamthitta districts: Sabarimala, Ponnambalamedu, Goundamala, Nagamala, Sundaramala, Chittambalamedu, Galkimala, Mathangamala, Mayiladummedu, Sreepadamala, Thevarmala, Nilakkalmala, Thalapparamala, Neelimala, Karimala, Puthusserymala, Kalakettymala and Inchipparamala. Its history is rooted in the Ay dynasty; Kanthaloorsala, an educational centre managed by the Ay dynasty, and Sabaripeedam were great centres of learning in the community's history.</p>
<h2>Aikya Mala Araya Maha Sabha (AMAMS)</h2>
<p>Shri. P K Sajeev, founder General Secretary, and Shri. M K Saji, State President of AMAMS, are the leaders behind the establishment of the college. The Mala Araya Women's Welfare Organisation, Mala Araya Youth Welfare Forum, Mala Araya Child Development Association, Mala Araya Young Cadets, Tribal Organic Farmers Forum, Tribal Welfare Cooperative Society, Sree Ayyappa Spiritual Promotion Forum and Mala Araya Educational Trust (MET) were formed under AMAMS for the integrated development of the community.</p>`,
  },
  management: {
    summary: 'The Mala Araya Educational Trust, the college administration and the mother organisation AMAMS.',
    body: `<p>Sree Sabareesa College is managed by the Mala Araya Educational Trust (MET), an educational charitable trust formed by the Aikya Mala Araya Maha Sabha (AMAMS) to uplift the educational status of Indian tribal people through high-quality higher education, multiple skill development and social mainstreaming. The college offers higher education to students who are socially and economically backward, with special reference to tribal areas, and works to connect them with national and international opportunities.</p>
<h2>Administration</h2>
<table class="table"><tbody>
<tr><th scope="row">Mr. Jijish M</th><td>Principal in-charge</td></tr>
<tr><th scope="row">Prof. M S Viswambharan</th><td>Former Principal (Retd. Deputy Director, Collegiate Education)</td></tr>
</tbody></table>
<h2>Mala Araya Educational Trust members</h2>
<table class="table"><tbody>
<tr><th scope="row">Shri. K R Gangadharan</th><td>Chairman</td></tr>
<tr><th scope="row">Mrs. Shailaja Narayanan</th><td>Vice Chairperson</td></tr>
<tr><th scope="row">Shri. K S Suresh</th><td>Vice Chairman</td></tr>
<tr><th scope="row">Shri. M B Rajan</th><td>Secretary</td></tr>
<tr><th scope="row">Shri. Sanal Kavanal</th><td>Joint Secretary</td></tr>
<tr><th scope="row">Shri. M G Mohanan</th><td>Joint Secretary</td></tr>
</tbody></table>
<h2>Aikya Mala Araya Maha Sabha (AMAMS)</h2>
<p>AMAMS is a registered tribal community development organisation working with the Mala Araya community of Kerala, led by Shri. P K Sajeev (General Secretary) and Shri. M K Saji (State President). The Sabha works through local branches formed by Mala Araya families, and owns and governs the college.</p>
<h2>Sree Sabareesa Centre of Excellence</h2>
<p>A personality-development programme initiated by the management to build students as global citizens: Theme Centred Interactions, Neuro-Linguistic Programming, rural development camps, life skill education, counselling, mental health services, mentoring, civil service motivation, national cultural exchange programmes and study tours.</p>
<h2>College Development Office</h2>
<p>Raises funds for college development, maintains public relations, and coordinates development projects, donations, grants-in-aid and financial assistance from different agencies.</p>
<h2>Professional development</h2>
<p>The college periodically conducts Faculty Orientation Programmes (FOP), Administrative Staff Training (AST) and Student Development Services (SDS) to improve leadership, managerial and administrative skills.</p>`,
  },
  iqac: {
    summary: 'The Internal Quality Assurance Cell builds a culture of quality across the college.',
    body: `<p>The Internal Quality Assurance Cell (IQAC) of Sree Sabareesa College was formed to ensure a culture of quality within the institution, with a prime focus on scientific knowledge, contemporary skills and human values among students. The IQAC develops mechanisms for timely, progressive performance of academic, administrative and financial tasks, and acts as the nodal agency for adopting and spreading best practices.</p>
<h2>Functions of the IQAC</h2>
${ul(['Design, development and implementation of quality benchmarks.', 'Creation and facilitation of a learner-centric academic environment.', 'Collection and analysis of quality-related feedback.', 'Promotion of quality circles and documentation.', 'Development and maintenance of the institutional database.', 'Periodic academic and administrative audits and follow-up.', 'Preparation and submission of the AQAR as per NAAC guidelines.'])}
<h2>IQAC team leaders</h2>
<table class="table"><tbody>
<tr><th scope="row">Mr. K R Gangadharan</th><td>Chairman, Mala Araya Educational Trust</td></tr>
<tr><th scope="row">Mr. Jijish M</th><td>Principal in-charge</td></tr>
<tr><th scope="row">Ms. Nowfiya Nazeer P.N</th><td>Coordinator, IQAC</td></tr>
</tbody></table>`,
  },
  committees: {
    title: 'Clubs, Cells and Forums',
    summary: 'Learning to know, to be, to do and to live: the clubs, cells and forums of the college.',
    body: `<p>Students take part in a wide range of clubs, cells and forums:</p>
${ul(['National Service Scheme', 'Innovation Council', 'Research & Development Cell', 'Innovation & Entrepreneurship Development Center', 'Free & Open Source Software Cell', 'Young Innovators Programme', 'Center for Research in Android Programming', 'Placement Cell', 'Counselling Cell', "Women's Forum", 'Anti Narcotic Cell', 'Sports & Health', 'Forestry Club', 'Civil Service Aspirants Forum', 'Arts Club', 'Anti Ragging Cell', 'SC/ST Cell', 'Ethnic Club', 'Gender Club', 'Computer Association', 'Commerce Association', 'Social Work Association', 'English Association', 'Music Club', 'Entrepreneurship Development Club'])}`,
  },
  nss: {
    summary: 'NSS units, the Community Extension Centre and the Tribal Organic Farmers Forum.',
    body: `<h2>NSS units</h2>
<p>The National Service Scheme (NSS) units of Sree Sabareesa College foster social responsibility, leadership and community service. Guided by the motto "Not Me, But You", NSS volunteers organise cleanliness drives, blood donation camps, tree plantation programmes, health awareness seminars and rural outreach activities.</p>
<h2>Community Extension Centre (CEC), Idukki District</h2>
<p>The Community Extension Centre is a tribal community development outreach centre that identifies tribal areas needing special intervention and addresses their problems through a multi-disciplinary team approach. It was launched on 10 February 2018 at Thodupuzha, Idukki district, following a decision of the AMAMS state committee. Its activities include:</p>
${ul(['Skill development training programmes in tribal areas', 'Agriculture promotion: agro field research, eco farming, organic farming, traditional seed banks and farmers groups', 'Social entrepreneurship groups: self-help groups for tribal women', 'Tribal child development forums', 'Counselling centres for families'])}
<h2>Tribal Organic Farmers Forum</h2>
<p>A community-based organisation run by the college to promote organic farming practices and research in tribal villages. Ten to twenty tribal farmers in a village form a forum that meets monthly for awareness classes, traditional organic farming of food crops, group farming, seed banking and bank linkage. Volunteers and social work trainees visit the forums regularly to learn and grow together with the farmers.</p>`,
  },
  admissions: {
    summary: 'Government-aided UG (MGU-UGP Honours) and PG programmes. Management quota seats are also available.',
    body: `<p>Sree Sabareesa College offers Government-aided undergraduate programmes under Mahatma Gandhi University's Four-Year UG Programme (MGU-UGP, Honours) and a postgraduate programme in Social Work. Management quota admission is also available for every programme.</p>
<h2>Programmes and seats</h2>
<table class="table"><thead><tr><th scope="col">Programme</th><th scope="col">Specialisations</th><th scope="col">Seats</th></tr></thead><tbody>
<tr><td>BA English (Honours)</td><td>Cultural Studies, Media Studies</td><td>30</td></tr>
<tr><td>B.Com (Honours), Batch 1</td><td>Finance &amp; Taxation, Marketing</td><td>40</td></tr>
<tr><td>B.Com (Honours), Batch 2</td><td>Accounting, Logistics Management</td><td>40</td></tr>
<tr><td>BCA (Honours), AICTE approved</td><td>Artificial Intelligence &amp; Machine Learning, Data Science</td><td>30</td></tr>
<tr><td>Master of Social Work (MSW)</td><td>Medical &amp; Psychiatric Social Work, Family &amp; Child Welfare, Community Development, Tribal Social Work</td><td></td></tr>
</tbody></table>
<h2>How to apply</h2>
<p>Merit seats are allotted through Mahatma Gandhi University's Centralised Allotment Process (UG-CAP and PG-CAP). For admission enquiries, including management quota, visit the college office or contact the admission helpdesk.</p>
<p><strong>Admission helpdesk:</strong> 9496180154, 7025895721, 04828 299758<br><strong>General enquiries:</strong> 04828 278560<br><strong>Email:</strong> <a href="mailto:sreesabareesacollege@gmail.com">sreesabareesacollege@gmail.com</a></p>`,
  },
  'faculty-directory': {
    summary: 'Teaching faculty by department.',
    body: null, // built from DEPARTMENTS below
  },
};

const PLACEMENT_PAGE = {
  title: 'Placement Cell', slug: 'placement-cell', menu_group: 'campus', menu_order: 3,
  summary: 'Building professional skills and connecting students with careers.',
  body: `<p>The Placement Cell develops multidimensional professional skills so that students can respond to the changing employment demands of modern society and industry. The cell also guides students towards a mindset open to innovative entrepreneurial ventures.</p>
${ul(['Annual Mega Job Fair', 'Soft skill training', 'Interview skill training', 'Collaboration services', 'Industrial visits', 'Entrepreneurship development', 'Student-led companies programme', 'Earn While You Learn programme', 'Alumni employment network', 'TCS Youth Employment Programme (TCS YEP) and National Qualifier Test (NQT)'])}
<p>The cell also helps students register with the Employability Centre, the National Career Service, the Kerala State Job Portal and Kerala PSC, and shares notifications from UPSC, NDA, the Railway Recruitment Board and the Staff Selection Commission.</p>`,
};

const NEWS = [
  { slug: 'higher-education-seminar-2025', type: 'event', title: 'ഉന്നതവിദ്യാഭ്യാസ സെമിനാർ (Higher Education Seminar)', date: '2025-10-17',
    summary: 'Higher education seminar at Sree Sabareesa College.',
    body: '<p><img src="/img/news/higher-education-seminar-2025.jpg" alt="Higher education seminar poster"></p>', featured: true },
  { slug: 'orientation-induction-first-year-ug-2025', type: 'notice', title: 'General Orientation and Induction Programme for First Year UG Students: Schedule', date: '2025-07-07',
    summary: 'Schedule of the general orientation and induction programme for first-year UG students.',
    body: '<p><img src="/img/news/orientation-2025-1.jpg" alt="Orientation programme schedule, page 1"></p><p><img src="/img/news/orientation-2025-2.jpg" alt="Orientation programme schedule, page 2"></p>', featured: true },
  { slug: 'zumba-instructions-2025', type: 'notice', title: 'Zumba Instructions', date: '2025-07-07',
    summary: 'Instructions for the Zumba session.',
    body: '<p><img src="/img/news/zumba-2025.jpg" alt="Zumba instructions"></p>', featured: false },
  { slug: 'sixth-semester-results-2025', type: 'notice', title: 'Sixth Semester Results', date: '2025-05-15',
    summary: 'Mahatma Gandhi University sixth semester (CBCS) results, March 2025.',
    body: '<p>The sixth semester results are published by Mahatma Gandhi University: <a href="https://www.mgu.ac.in/uploads/2025/05/6-sem-cbcs-march-2025.pdf" rel="noopener">view the results (PDF)</a>.</p>', featured: false },
];

// ---- Sabari answers -------------------------------------------------------
// Keyed by the English question used in the original starter content.
const FAQ_UPDATES = {
  'How can I apply for admission?': {
    en: 'Merit seats for the UG (MGU-UGP Honours) and PG programmes are allotted through Mahatma Gandhi University\'s Centralised Allotment Process (CAP). Management quota seats are also available. For enquiries, visit the college office or call the admission helpdesk: {{admission_phone}}.',
    ml: 'യുജി (എംജിയു-യുജിപി ഓണേഴ്സ്), പിജി കോഴ്സുകളിലെ മെറിറ്റ് സീറ്റുകൾ മഹാത്മാഗാന്ധി സർവകലാശാലയുടെ ഏകജാലക പ്രവേശന (CAP) വഴിയാണ് അനുവദിക്കുന്നത്. മാനേജ്മെന്റ് ക്വാട്ട സീറ്റുകളും ലഭ്യമാണ്. കൂടുതൽ വിവരങ്ങൾക്ക് കോളേജ് ഓഫീസ് സന്ദർശിക്കുകയോ അഡ്മിഷൻ ഹെൽപ്പ്ഡെസ്കിൽ വിളിക്കുകയോ ചെയ്യുക: {{admission_phone}}.',
  },
  'What courses are available?': {
    en: 'The college offers Government-aided programmes: BA English (Honours) – 30 seats; B.Com (Honours) – two batches of 40 seats; BCA (Honours, AICTE approved) – 30 seats; and the Master of Social Work (MSW).',
    ml: 'സർക്കാർ എയ്ഡഡ് കോഴ്സുകൾ: ബിഎ ഇംഗ്ലീഷ് (ഓണേഴ്സ്) – 30 സീറ്റ്; ബികോം (ഓണേഴ്സ്) – 40 സീറ്റ് വീതമുള്ള രണ്ട് ബാച്ചുകൾ; ബിസിഎ (ഓണേഴ്സ്, എഐസിടിഇ അംഗീകൃതം) – 30 സീറ്റ്; മാസ്റ്റർ ഓഫ് സോഷ്യൽ വർക്ക് (എംഎസ്ഡബ്ല്യു).',
  },
  'Which departments are there?': {
    en: 'The college has four departments: English, Commerce, Computer Applications, and the PG Department of Social Work.',
    ml: 'കോളേജിൽ നാല് വകുപ്പുകളുണ്ട്: ഇംഗ്ലീഷ്, കൊമേഴ്സ്, കമ്പ്യൂട്ടർ ആപ്ലിക്കേഷൻസ്, സോഷ്യൽ വർക്ക് ബിരുദാനന്തര ബിരുദ വകുപ്പ്.',
  },
  'How can I contact the college?': {
    en: 'General enquiries: {{phone}}. Admission helpdesk: {{admission_phone}}. Email: {{email}}.',
    ml: 'പൊതുവായ അന്വേഷണങ്ങൾ: {{phone}}. അഡ്മിഷൻ ഹെൽപ്പ്ഡെസ്ക്: {{admission_phone}}. ഇമെയിൽ: {{email}}.',
  },
};

const NEW_FAQS = [
  ['admissions', '/admissions', 'Is management quota admission available?',
    'Yes. Management quota seats are available for every programme. Contact the admission helpdesk: {{admission_phone}}.',
    'മാനേജ്മെന്റ് ക്വാട്ട പ്രവേശനം ലഭ്യമാണോ?', 'അതെ. എല്ലാ കോഴ്സുകളിലും മാനേജ്മെന്റ് ക്വാട്ട സീറ്റുകൾ ലഭ്യമാണ്. അഡ്മിഷൻ ഹെൽപ്പ്ഡെസ്ക്: {{admission_phone}}.',
    ['management quota', 'management seat', 'quota'], ['മാനേജ്മെന്റ', 'ക്വാട്ട'], true],
  ['courses', '/departments/social-work', 'What are the MSW specialisations?',
    'The MSW programme offers specialisations in Medical & Psychiatric Social Work, Family & Child Welfare, Community Development and Tribal Social Work.',
    'എംഎസ്ഡബ്ല്യു സ്പെഷ്യലൈസേഷനുകൾ ഏതൊക്കെയാണ്?', 'മെഡിക്കൽ & സൈക്യാട്രിക് സോഷ്യൽ വർക്ക്, ഫാമിലി & ചൈൽഡ് വെൽഫെയർ, കമ്മ്യൂണിറ്റി ഡെവലപ്മെന്റ്, ട്രൈബൽ സോഷ്യൽ വർക്ക് എന്നിവയാണ് എംഎസ്ഡബ്ല്യു സ്പെഷ്യലൈസേഷനുകൾ.',
    ['msw', 'social work', 'master of social work'], ['എംഎസ്ഡബ്ല്യു', 'സോഷ്യൽ വർക്ക'], true],
  ['courses', '/departments/computer-applications', 'What are the BCA specialisations?',
    'BCA (Honours) is AICTE approved, with 30 seats and specialisations in Artificial Intelligence & Machine Learning and Data Science.',
    'ബിസിഎ സ്പെഷ്യലൈസേഷനുകൾ ഏതൊക്കെയാണ്?', 'എഐസിടിഇ അംഗീകൃത ബിസിഎ (ഓണേഴ്സ്) കോഴ്സിന് 30 സീറ്റുകളുണ്ട്. ആർട്ടിഫിഷ്യൽ ഇന്റലിജൻസ് & മെഷീൻ ലേണിംഗ്, ഡാറ്റ സയൻസ് എന്നിവയാണ് സ്പെഷ്യലൈസേഷനുകൾ.',
    ['bca', 'computer application', 'data science', 'artificial intelligence', 'machine learning'], ['ബിസിഎ', 'കമ്പ്യൂട്ടർ'], true],
  ['courses', '/departments/commerce', 'What are the B.Com specialisations?',
    'B.Com (Honours) has two batches of 40 seats: Batch 1 – Finance & Taxation and Marketing; Batch 2 – Accounting and Logistics Management. It is integrated with ACCA / CMA coaching.',
    'ബികോം സ്പെഷ്യലൈസേഷനുകൾ ഏതൊക്കെയാണ്?', 'ബികോം (ഓണേഴ്സ്) കോഴ്സിന് 40 സീറ്റ് വീതമുള്ള രണ്ട് ബാച്ചുകളുണ്ട്: ബാച്ച് 1 – ഫിനാൻസ് & ടാക്സേഷൻ, മാർക്കറ്റിംഗ്; ബാച്ച് 2 – അക്കൗണ്ടിംഗ്, ലോജിസ്റ്റിക്സ് മാനേജ്മെന്റ്. എസിസിഎ / സിഎംഎ പരിശീലനവും ഉൾപ്പെടുന്നു.',
    ['bcom', 'b com', 'commerce', 'acca', 'cma'], ['ബികോം', 'കൊമേഴ്സ'], true],
  ['courses', '/departments/english', 'What are the BA English specialisations?',
    'BA English (Honours) has 30 seats, with specialisations in Cultural Studies and Media Studies.',
    'ബിഎ ഇംഗ്ലീഷ് സ്പെഷ്യലൈസേഷനുകൾ ഏതൊക്കെയാണ്?', 'ബിഎ ഇംഗ്ലീഷ് (ഓണേഴ്സ്) കോഴ്സിന് 30 സീറ്റുകളുണ്ട്. കൾച്ചറൽ സ്റ്റഡീസ്, മീഡിയ സ്റ്റഡീസ് എന്നിവയാണ് സ്പെഷ്യലൈസേഷനുകൾ.',
    ['ba english', 'english course', 'media studies', 'cultural studies'], ['ബിഎ ഇംഗ്ലീഷ', 'ഇംഗ്ലീഷ് കോഴ്സ'], true],
  [null, '/about', 'Which university is the college affiliated to?',
    'Sree Sabareesa College is affiliated to Mahatma Gandhi University, Kottayam, and approved by AICTE, New Delhi.',
    'കോളേജ് ഏത് സർവകലാശാലയുമായി അഫിലിയേറ്റ് ചെയ്തിരിക്കുന്നു?', 'ശ്രീ ശബരീശ കോളേജ് കോട്ടയം മഹാത്മാഗാന്ധി സർവകലാശാലയുമായി അഫിലിയേറ്റ് ചെയ്തതും ന്യൂഡൽഹി എഐസിടിഇ അംഗീകരിച്ചതുമാണ്.',
    ['university', 'affiliated', 'affiliation', 'aicte', 'mg university', 'mgu'], ['സർവകലാശാല', 'അഫിലിയേ', 'യൂണിവേഴ്സിറ്റി'], false],
  [null, '/management', 'Who manages the college?',
    'The college is managed by the Mala Araya Educational Trust (MET) under the Aikya Mala Araya Maha Sabha (AMAMS). It is India\'s first Government-aided Arts & Science College run by tribal management.',
    'കോളേജ് നടത്തുന്നത് ആരാണ്?', 'ഐക്യ മലഅരയ മഹാസഭയുടെ (AMAMS) കീഴിലുള്ള മലഅരയ എജ്യുക്കേഷണൽ ട്രസ്റ്റ് (MET) ആണ് കോളേജ് നടത്തുന്നത്. ഗോത്രവർഗ മാനേജ്മെന്റ് നടത്തുന്ന ഇന്ത്യയിലെ ആദ്യത്തെ സർക്കാർ എയ്ഡഡ് ആർട്സ് & സയൻസ് കോളേജാണിത്.',
    ['management', 'manage', 'trust', 'amams', 'mala araya', 'tribal'], ['മാനേജ്മെന്റ്', 'ട്രസ്റ്റ', 'മലഅരയ', 'നടത്തുന്നത'], false],
  [null, '/about', 'When was the college established?',
    'Sree Sabareesa College was established in 2017.',
    'കോളേജ് സ്ഥാപിച്ചത് എപ്പോഴാണ്?', 'ശ്രീ ശബരീശ കോളേജ് 2017-ലാണ് സ്ഥാപിച്ചത്.',
    ['established', 'founded', 'start', 'history', 'year'], ['സ്ഥാപിച്ച', 'ചരിത്ര', 'ആരംഭിച്ച'], false],
  [null, '/management', 'Who is the principal?',
    'Mr. Jijish M is the Principal in-charge of Sree Sabareesa College.',
    'പ്രിൻസിപ്പൽ ആരാണ്?', 'ശ്രീ. ജിജിഷ് എം ആണ് ശ്രീ ശബരീശ കോളേജിന്റെ പ്രിൻസിപ്പൽ ഇൻ-ചാർജ്.',
    ['principal'], ['പ്രിൻസിപ്പൽ'], false],
  [null, '/placement-cell', 'Is there a placement cell?',
    'Yes. The Placement Cell runs an annual mega job fair, soft skill and interview training, industrial visits, entrepreneurship development and the TCS Youth Employment Programme.',
    'പ്ലേസ്മെന്റ് സെൽ ഉണ്ടോ?', 'ഉണ്ട്. വാർഷിക മെഗാ ജോബ് ഫെയർ, സോഫ്റ്റ് സ്കിൽ, ഇന്റർവ്യൂ പരിശീലനം, ഇൻഡസ്ട്രിയൽ വിസിറ്റുകൾ, സംരംഭകത്വ വികസനം, ടിസിഎസ് യൂത്ത് എംപ്ലോയ്മെന്റ് പ്രോഗ്രാം എന്നിവ പ്ലേസ്മെന്റ് സെൽ നടത്തുന്നു.',
    ['placement', 'job', 'career', 'recruitment'], ['പ്ലേസ്മെന്റ', 'ജോലി', 'ജോബ'], false],
  [null, '/committees', 'What clubs and cells are there?',
    'The college has 25 clubs, cells and forums, including NSS, the Innovation Council, Placement Cell, Counselling Cell, Women\'s Forum, Anti Ragging Cell, SC/ST Cell, Arts Club, Music Club and the department associations.',
    'ഏതൊക്കെ ക്ലബ്ബുകളും സെല്ലുകളുമുണ്ട്?', 'എൻഎസ്എസ്, ഇന്നൊവേഷൻ കൗൺസിൽ, പ്ലേസ്മെന്റ് സെൽ, കൗൺസലിംഗ് സെൽ, വിമൻസ് ഫോറം, ആന്റി റാഗിംഗ് സെൽ, എസ്‌സി/എസ്‌ടി സെൽ, ആർട്സ് ക്ലബ്, മ്യൂസിക് ക്ലബ്, വകുപ്പ് അസോസിയേഷനുകൾ എന്നിവ ഉൾപ്പെടെ 25 ക്ലബ്ബുകളും സെല്ലുകളും ഫോറങ്ങളും കോളേജിലുണ്ട്.',
    ['club', 'cell', 'forum', 'nss', 'association', 'activities'], ['ക്ലബ്ബ', 'സെൽ', 'ഫോറ', 'എൻഎസ്എസ'], false],
];

// ---------------------------------------------------------------------------

async function apply(knex) {
  const done = await knex('settings').where({ setting_key: 'content_import' }).first();
  if (done && done.setting_value === MARK) return { skipped: true };
  const now = sqlNow();
  const log = [];

  await knex.transaction(async (trx) => {
    // Settings
    for (const [key, value] of Object.entries(SETTINGS)) {
      const row = await trx('settings').where({ setting_key: key }).first();
      if (!row) { await trx('settings').insert({ setting_key: key, setting_value: value }); continue; }
      if (key === 'office_hours' ? SAMPLE_SETTING.test(row.setting_value || '') : (!row.setting_value || SAMPLE_SETTING.test(row.setting_value))) {
        await trx('settings').where({ setting_key: key }).update({ setting_value: value });
      }
    }
    log.push('settings');

    // Departments: replace the four sample departments, keep anything an admin created or edited.
    const isSample = (d) => /^Sample department/.test(d.description || '');
    const existing = await trx('departments');
    const deptIds = {};
    for (const d of DEPARTMENTS) {
      const row = existing.find((e) => e.slug === d.slug) || (d.slug === 'computer-applications' && existing.find((e) => e.slug === 'computer-science' && isSample(e)));
      const data = { name: d.name, slug: d.slug, short_name: d.short_name, description: d.description, hod_name: d.hod_name, faculty_text: d.faculty_text, sort_order: d.sort_order, status: 'active', updated_at: now };
      if (row && isSample(row)) { await trx('departments').where({ id: row.id }).update(data); deptIds[d.slug] = row.id; }
      else if (row) { deptIds[d.slug] = row.id; }
      else { deptIds[d.slug] = idOf((await trx('departments').insert(data))[0]); }
    }
    // The sample "Department of Malayalam" does not exist at the college.
    for (const e of existing) if (e.slug === 'malayalam' && isSample(e)) {
      await trx('departments').where({ id: e.id }).update({ status: 'archived', updated_at: now });
    }

    // Programmes: archive the sample ones, add the real ones.
    await trx('programmes').where('name', 'like', '%(sample)').update({ status: 'archived', updated_at: now });
    for (const p of PROGRAMMES) {
      if (await trx('programmes').where({ slug: p.slug }).first()) continue;
      await trx('programmes').insert({ department_id: deptIds[p.dept] || null, name: p.name, slug: p.slug, level: p.level, duration: null,
        intake: p.intake, description: p.description, sort_order: PROGRAMMES.indexOf(p) + 1, status: 'active' });
    }

    // Pages: only overwrite pages that still contain the starter placeholder.
    const fac = DEPARTMENTS.map((d) => `<h2>${d.name}</h2><table class="table"><tbody>${d.faculty_text.split('\n').map((l) => {
      const [n, r] = l.split(' | '); return `<tr><th scope="row">${n}</th><td>${r}</td></tr>`; }).join('')}</tbody></table>`).join('\n');
    PAGES['faculty-directory'].body = `<p>Teaching faculty of each department. Individual profiles will be added through the Faculty Portal.</p>\n${fac}`;
    for (const [slug, p] of Object.entries(PAGES)) {
      const row = await trx('pages').where({ slug }).first();
      if (!row || !/placeholder-note/.test(row.body || '')) continue;
      await trx('pages').where({ id: row.id }).update({ title: p.title || row.title, summary: p.summary, body: p.body, updated_at: now });
    }
    if (!(await trx('pages').where({ slug: PLACEMENT_PAGE.slug }).first())) {
      await trx('pages').insert({ ...PLACEMENT_PAGE, show_in_menu: true, status: 'published' });
    }

    // News: unpublish the sample items, add recent items from the old site.
    await trx('news').where('title', 'like', 'Sample %').update({ status: 'draft', is_featured: false, updated_at: now });
    const year = await trx('academic_years').where({ label: '2025-26' }).first()
      || { id: idOf((await trx('academic_years').insert({ label: '2025-26', start_date: '2025-06-01', end_date: '2026-03-31', is_current: false }))[0]) };
    for (const n of NEWS) {
      if (await trx('news').where({ slug: n.slug }).first()) continue;
      await trx('news').insert({ type: n.type, title: n.title, slug: n.slug, summary: n.summary, body: n.body, event_date: n.type === 'event' ? n.date : null,
        academic_year_id: year.id, is_featured: n.featured, status: 'published', published_at: `${n.date} 09:00:00` });
    }

    // Homepage banner: real headline and campus photo if it is still the sample banner.
    const banner = await trx('banners').orderBy('sort_order').first();
    if (banner && /^Sample banner/.test(banner.subtitle || '')) {
      await trx('banners').where({ id: banner.id }).update({ title: 'Sree Sabareesa College', subtitle: 'Education – Enlightenment. Government-aided UG and PG programmes, affiliated to Mahatma Gandhi University and approved by AICTE.',
        link_url: '/about', link_label: 'About the college', image_url: '/img/hero-convocation.jpg', updated_at: now });
    }

    // Sabari: update answers that still hold the starter text, refresh department FAQs, add new FAQs.
    const tr = await trx('sabari_faq_translations');
    for (const [qEn, upd] of Object.entries(FAQ_UPDATES)) {
      const en = tr.find((t) => t.language === 'en' && t.question === qEn);
      if (!en) continue;
      await trx('sabari_faq_translations').where({ faq_id: en.faq_id, language: 'en' }).update({ answer: upd.en });
      await trx('sabari_faq_translations').where({ faq_id: en.faq_id, language: 'ml' }).update({ answer: upd.ml });
    }
    const cats = Object.fromEntries((await trx('sabari_categories').select('id', 'code')).map((c) => [c.code, c.id]));
    // Department HOD questions: remove the sample ones and create real ones.
    const sampleHod = await trx('sabari_faqs').where('source_url', 'like', '/departments/%').pluck('id');
    if (sampleHod.length) await trx('sabari_faqs').whereIn('id', sampleHod).del();
    const deptFaqs = DEPARTMENTS.map((d) => [d.slug === 'social-work' ? 'departments' : 'departments', `/departments/${d.slug}`,
      `Who is the HOD of ${d.short_name}?`, `The Head of the ${d.name} is ${d.hod_name}.`,
      `${d.ml} വകുപ്പിന്റെ മേധാവി ആരാണ്?`, `${d.ml} വകുപ്പിന്റെ മേധാവി ${d.hod_name} ആണ്.`,
      [`hod ${d.short_name}`, `head ${d.short_name}`, `${d.short_name} department`, ...(d.slug === 'computer-applications' ? ['hod bca', 'hod computer'] : []), ...(d.slug === 'social-work' ? ['hod msw'] : [])],
      [`${d.ml} മേധാവി`, `${d.ml} വകുപ്പ`], false]);
    let priority = -20;
    for (const [code, sourceUrl, qEn, aEn, qMl, aMl, kEn, kMl, quick] of [...NEW_FAQS, ...deptFaqs]) {
      if (tr.find((t) => t.question === qEn) && !sourceUrl.startsWith('/departments/')) continue;
      const faqId = idOf((await trx('sabari_faqs').insert({ category_id: code ? cats[code] || null : null, source_url: sourceUrl, status: 'published', priority: priority-- }))[0]);
      await trx('sabari_faq_translations').insert([{ faq_id: faqId, language: 'en', question: qEn, answer: aEn }, { faq_id: faqId, language: 'ml', question: qMl, answer: aMl }]);
      await trx('sabari_keywords').insert([...kEn.map((k) => ({ faq_id: faqId, language: 'en', keyword: normalize(k) })), ...kMl.map((k) => ({ faq_id: faqId, language: 'ml', keyword: normalize(k) }))]);
      if (quick && code && cats[code]) {
        await trx('sabari_quick_replies').insert([{ category_id: cats[code], faq_id: faqId, language: 'en', label: qEn, sort_order: 5 }, { category_id: cats[code], faq_id: faqId, language: 'ml', label: qMl, sort_order: 5 }]);
      }
    }
    // Faculty & Staff quick replies: link department HOD questions.
    const hodFaqs = await trx('sabari_faqs').where('source_url', 'like', '/departments/%').select('id', 'source_url');
    if (cats.faculty) {
      for (const f of hodFaqs) {
        const t = await trx('sabari_faq_translations').where({ faq_id: f.id });
        await trx('sabari_quick_replies').insert(t.map((x) => ({ category_id: cats.faculty, faq_id: f.id, language: x.language, label: x.question, sort_order: 5 })));
      }
    }

    if (done) await trx('settings').where({ setting_key: 'content_import' }).update({ setting_value: MARK });
    else await trx('settings').insert({ setting_key: 'content_import', setting_value: MARK });
  });
  return { skipped: false, log };
}

module.exports = { apply, MARK };
