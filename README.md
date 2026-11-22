# NaRa

Astro landing page for NaRa, ready for Netlify deployment.

## Commands

```sh
npm run dev
npm run build
npm run preview
```

Netlify uses `npm run build` and publishes `dist`.

## Editing Press and About Us in Sanity

The site defaults to the dedicated NaRa-Web project (`5qn2z2dc`) and its public `production` dataset. Add the local and deployed site origins in the project's CORS settings and enable credentials for Studio. Open `/sanity-cms` and sign in with an account that can edit the NaRa project.

NaRa Studio includes Press and About Us. Press entries can link out or display a gallery. Match an existing entry's slug to update it. About Us is a single document with an introduction and an editable list of team members, bios, websites, and emails.

The public site can use a different project or dataset through `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET`. The home page reads published content when requested. In Press, the create menu has a template for each starting entry.
