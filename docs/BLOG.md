# The blog

The blog lives at `promotello.com/blog` and is written for business owners: it's how Promotello gets found by café, salon and shop owners searching for help, and by the AI assistants they ask.

Posts are Markdoc files in `content/blog/`, authors are in `content/authors/`, and images go in `public/images/blog/`. You edit them in **Keystatic**, a writing editor at `/keystatic`.

## Writing a post

**On your computer (works today):**

1. `npm run dev`, then open http://localhost:3000/keystatic
2. **Blog posts → +**. Fill in the title, summary, category and author, write the post, and add key takeaways and questions.
3. Untick **Draft** when it's ready, and save. Keystatic writes the file into `content/blog/`.
4. Commit and push (or ask Claude to). Vercel publishes it when the change reaches `main`.

**On the live site (one-time setup):** Keystatic saves through GitHub, so only people with access to the repository can edit, and every save is a commit that Vercel publishes in about a minute.

1. In `.env.local`, add `NEXT_PUBLIC_KEYSTATIC_STORAGE=github`, run `npm run dev` and open http://localhost:3000/keystatic.
2. Follow Keystatic's prompt to **create a GitHub app** for `harrynortham/promotello`. It creates the app and writes four values into `.env`: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`.
3. Install the app on the `promotello` repository when GitHub asks.
4. In the GitHub app's settings, add the live callback URL: `https://www.promotello.com/api/keystatic/github/oauth/callback`
5. Add the four values and `NEXT_PUBLIC_KEYSTATIC_STORAGE=github` to Vercel (Production), then redeploy.
6. Open https://www.promotello.com/keystatic and sign in with GitHub.

Until step 5, `/keystatic` returns "not found" on the live site.

## Writing posts that get found (and quoted by AI)

Search engines and AI assistants (ChatGPT, Claude, Perplexity, Google's AI Overviews) favour posts that answer a real question clearly and come from someone who knows the subject.

- **Title = the question a business owner would type.** "How to fill quiet hours" beats "Off-peak strategies".
- **Answer it in the summary and first paragraph.** AI tools often quote the first clear answer they find.
- **Use question-style headings** ("How long should an off-peak offer run?") and answer each in the first sentence under it.
- **Add 3 to 5 key takeaways** and **3 to 5 questions and answers**. Both are shown on the page and marked up for search engines.
- **Use tables and numbered steps** for comparisons and how-tos.
- **Be specific.** Worked examples ("a £3.20 coffee and a 60p pastry…") beat vague claims. Never make up statistics; if you quote a number, link to where it came from.
- **Link to two or three other pages**: related posts and the features, pricing or sign-up page. Add a call-to-action block.
- **Update old posts** and set "Last updated". Freshness matters to both Google and AI tools.
- **Aim for 2 to 4 strong posts a month** rather than many thin ones.

## What's built in

- Search: titles, descriptions, canonical addresses, social preview images, Article / FAQ / breadcrumb structured data, the sitemap, and an RSS feed at `/blog/rss.xml`.
- AI: `/llms.txt` (a guide to the site for AI tools), a Markdown version of every post at `/blog/md/<slug>`, AI crawlers explicitly allowed in `robots.txt`, and IndexNow, which tells Bing (used by ChatGPT search and Copilot) about new posts each day.

## Once, after launch

- Add the site to **Google Search Console** and **Bing Webmaster Tools** and submit `https://www.promotello.com/sitemap.xml` to both. Bing feeds ChatGPT search, so don't skip it.
