import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@chromatic-com/storybook",
    "msw-storybook-addon",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
};

export default config;
