// One page for each club, cell and forum listed on the "Clubs, Cells and Forums" page (/committees),
// requested by the college on 2026-11-26.
//
// Safety rules:
// - Runs once (marked by the setting "club_pages").
// - Skips any club that already has a page (same web address or same title), and links to that page instead.
// - On /committees it only turns the plain list items into links, so other edits to that page are kept.

const { sqlNow } = require('../services/dates');

const MARK = 'clubs-2026-11-26';

const todo = (name) => `<p class="placeholder-note">This page is ready for the official details of the ${name}: its aims, coordinator, members, activities and photos. ` +
  'An administrator can add them from <strong>Admin → Pages</strong>.</p>';

// [list name as shown on /committees, web address, summary, body (null = details still to be added)]
const CLUBS = [
  ['National Service Scheme', 'nss'],
  ['Innovation Council', 'innovation-council'],
  ['Research & Development Cell', 'research-development-cell'],
  ['Innovation & Entrepreneurship Development Center', 'innovation-entrepreneurship-development-center'],
  ['Free & Open Source Software Cell', 'foss-cell', 'Popularising Free and Open Source Software among students.',
    `<p>The Free &amp; Open Source Software (FOSS) Cell works with ICFOSS, an autonomous institution under the Government of Kerala with the mandate of popularising Free and Open Source Software. The college holds an institutional membership with ICFOSS.</p>
<p>The cell is run by the <a href="/departments/computer-applications">Department of Computer Applications</a>.</p>`],
  ['Young Innovators Programme', 'young-innovators-programme'],
  ['Center for Research in Android Programming', 'android-programming-research', 'A student-centred technical club specialising in mobile application development.',
    `<p>The Center for Research in Android Programming (CRAP) is a student-centred technical club specialising in mobile application development. It works from the dedicated Android Programming Research Centre of the <a href="/departments/computer-applications">Department of Computer Applications</a>.</p>`],
  ['Placement Cell', 'placement-cell'],
  ['Counselling Cell', 'counselling-cell'],
  ["Women's Forum", 'womens-forum'],
  ['Anti Narcotic Cell', 'anti-narcotic-cell'],
  ['Sports & Health', 'sports-health'],
  ['Forestry Club', 'forestry-club'],
  ['Civil Service Aspirants Forum', 'civil-service-aspirants-forum'],
  ['Arts Club', 'arts-club'],
  ['Anti Ragging Cell', 'anti-ragging-cell'],
  ['SC/ST Cell', 'sc-st-cell'],
  ['Ethnic Club', 'ethnic-club'],
  ['Gender Club', 'gender-club'],
  ['Computer Association', 'computer-association', 'GOOGOL, the Computer Association of the Department of Computer Applications.',
    `<p>GOOGOL, the Computer Association of the <a href="/departments/computer-applications">Department of Computer Applications</a>, was established in 2019 with the mission to enhance the overall skills of students. Dedicated to technical excellence and innovation, GOOGOL organises workshops, seminars and technical fests, giving students platforms to showcase their talents and engage with emerging technologies.</p>
<p>The association works with the Kerala Blockchain Academy and ICFOSS to offer specialised training and certifications, so that students are well equipped for the evolving IT industry.</p>
<h2>AAVISHKAAR</h2>
<p>AAVISHKAAR is the national-level tech fest that GOOGOL organises every academic year, a gateway for future IT professionals to showcase their technical skills.</p>`],
  ['Commerce Association', 'commerce-association', 'The student association of the Department of Commerce.',
    `<p>The Commerce Association is the student association of the <a href="/departments/commerce">Department of Commerce</a>.</p>\n`],
  ['Social Work Association', 'social-work-association'],
  ['English Association', 'english-association', 'Laurelite, the English Association of the Department of English.',
    `<p>Laurelite, the English Association of the <a href="/departments/english">Department of English</a>, is a platform for creativity, critical thinking and cultural expression. It runs literary festivals, debates, public speaking forums, theatre performances, creative writing workshops and dialogues on cultural heritage.</p>
<p>Through student-led initiatives, interdisciplinary collaborations and mentorship, Laurelite helps shape graduates who are academically proficient, socially conscious and confident in literary and cultural conversations.</p>`],
  ['Music Club', 'music-club'],
  ['Entrepreneurship Development Club', 'entrepreneurship-development-club'],
];

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function apply(knex) {
  const done = await knex('settings').where({ setting_key: 'club_pages' }).first();
  if (done && done.setting_value === MARK) return;

  await knex.transaction(async (trx) => {
    const now = sqlNow();
    const existing = await trx('pages').select('slug', 'title');
    const bySlug = new Set(existing.map((p) => p.slug));
    const byTitle = new Map(existing.map((p) => [p.title.trim().toLowerCase(), p.slug]));
    const links = [];
    let order = 1;

    for (const [name, slug, summary, body] of CLUBS) {
      let target = byTitle.get(name.toLowerCase());
      if (!target && bySlug.has(slug)) target = slug;
      if (!target) {
        // The commerce page has one known sentence; the rest of its details are still to come.
        const html = body ? (body.endsWith('\n') ? body + todo(name) : body) : todo(name);
        await trx('pages').insert({
          title: name, slug, summary: summary || `One of the clubs, cells and forums of Sree Sabareesa College.`,
          body: html, menu_group: 'clubs', menu_order: order, show_in_menu: false, status: 'published', created_at: now, updated_at: now,
        });
        target = slug;
      }
      links.push([name, target]);
      order += 1;
    }

    // Turn the plain list on /committees into links (works whether "&" was stored as "&" or "&amp;").
    const committees = await trx('pages').where({ slug: 'committees' }).first();
    if (committees && committees.body) {
      let html = committees.body;
      for (const [name, target] of links) {
        for (const variant of new Set([name, escapeHtml(name), name.replace(/'/g, '&#39;'), name.replace(/'/g, '&#x27;')])) {
          html = html.split(`<li>${variant}</li>`).join(`<li><a href="/${target}">${escapeHtml(name)}</a></li>`);
        }
      }
      html = html.replace(/<ul>(\s*<li><a href=)/, '<ul class="link-columns">$1');
      if (html !== committees.body) await trx('pages').where({ id: committees.id }).update({ body: html, updated_at: now });
    }

    if (done) await trx('settings').where({ setting_key: 'club_pages' }).update({ setting_value: MARK });
    else await trx('settings').insert({ setting_key: 'club_pages', setting_value: MARK });
  });
}

module.exports = { apply, MARK, CLUBS };
