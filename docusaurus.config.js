const {themes} = require('prism-react-renderer');

module.exports = {
  title: 'LLMRT',
  tagline: 'A tiny, dependency-free web runtime for JSON-based game cartridges',
  favicon: 'img/favicon.ico',

  url: 'https://shoshin.tech',
  baseUrl: '/llmrt/',
  organizationName: 'your-github-username',
  projectName: 'llmrt',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/your-github-username/llmrt/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig: {
    image: 'img/llmrt-social-card.jpg',
    navbar: {
      title: 'LLMRT',
      logo: {
        alt: 'LLMRT Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/your-github-username/llmrt',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Quickstart',
              to: '/docs/quickstart',
            },
            {
              label: 'API Documentation',
              to: '/docs/api-documentation',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/your-github-username/llmrt',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} LLMRT. Built with Docusaurus.`,
    },
    prism: {
      theme: themes.github,
      darkTheme: themes.dracula,
    },
  },

  trailingSlash: false,
};