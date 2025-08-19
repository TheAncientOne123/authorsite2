// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';
import {resolve } from 'node:path';
// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**@type {[string, import('@docusaurus/plugin-content-docs').Options]} */
const docsOrbe = [
  '@docusaurus/plugin-content-docs',
  {
    id: 'orbe',
    path: 'docs/orbe',
    routeBasePath: 'orbe',
    sidebarPath: resolve('./orbe_sidebars.js'),
    breadcrumbs: true,
  },
];

/**@type {[string, import('@docusaurus/plugin-content-docs').Options]} */
const docsCronicas = [
  '@docusaurus/plugin-content-docs',
  {
    id: 'cronicas',
    path: 'docs/CrSaSo',
    routeBasePath: 'CrSaSo',
    sidebarPath: resolve('./docs/CrSaSo/cronicas_sidebars.js'),
    breadcrumbs: true,
  },
];


/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'El Códice',
  favicon: 'img/favicon.ico',


  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://TheAncientOne123.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'TheAncientOne123', // Usually your GitHub org/user name.
  projectName: 'authorsite2', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  plugins: [docsOrbe, docsCronicas],

  themeConfig:

    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'El Códice',
        logo: {
          alt: 'My Site Logo',
          src: 'img/logoDark.png',
        },
        items: [
          {
            href: 'https://www.instagram.com/hectorrsanchez?igsh=dGVlZWlobnlhY2Vw',
            label: 'Instagram',
            position: 'right',
          },
        ],
      },

      announcementBar:{
        id: 'spoiler_notice_v1',
        content: 'Este códice contiene spoilers de las obras. Se recomienda leer los libros antes de consultar.',
        backgroundColor: '#1f2937',
        textColor: '#e5e7eb',
        isCloseable: true,
      },


      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} El Códice. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),

};

export default config;
