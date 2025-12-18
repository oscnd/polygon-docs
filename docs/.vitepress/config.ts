import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid({
  title: "Polygon",
  description: "Prismatic Go ecosystem where magic snaps into seamless harmony",
  head: [],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Architecture", link: "/architecture/" },
      { text: "Usage", link: "/usage/" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/oscnd/polygon" }],
    sidebar: {
      "/usage/": [
        {
          text: "Setup",
          items: [
            { text: "Installation", link: "/usage/01_setup/01_installation" },
            { text: "Configuration", link: "/usage/01_setup/02_configuration" },
          ],
        },
        {
          text: "Command",
          items: [
            {
              text: "sequel",
              items: [
                {
                  text: "Configuration",
                  link: "/usage/02_command/01_sequel/01_configuration",
                },
              ],
            },
          ],
        },
      ],
    },
    search: {
      provider: "local",
    },
  },
  mermaid: {},
  mermaidPlugin: {},
});
