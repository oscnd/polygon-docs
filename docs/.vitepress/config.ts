import { generateSidebar } from "vitepress-sidebar";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid({
  title: "Polygon",
  description: "Prismatic Go ecosystem where magic snaps into seamless harmony",
  head: [],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Architecture", link: "/architecture/" },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/oscnd/polygon" }],
    sidebar: generateSidebar([
      {
        documentRootPath: "docs",
        scanStartPath: "architecture",
        basePath: "/architecture/",
        resolvePath: "/architecture/",
        collapsed: false,
        capitalizeFirst: true,
        useTitleFromFileHeading: true,
      },
    ]),
    search: {
      provider: "local",
    },
  },
  mermaid: {},
  mermaidPlugin: {},
});
