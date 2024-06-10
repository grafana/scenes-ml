/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  sidebar: [
    {
      type: 'category',
      label: 'Getting started',
      collapsible: true,
      collapsed: false,
      items: ['getting-started'],
    },
    {
      type: 'category',
      label: 'Machine Learning functionality',
      collapsible: true,
      collapsed: false,
      items: [
        'baselines-and-forecasts',
        'outlier-detection',
        'changepoint-detection',
      ],
    },
    {
      type: 'category',
      label: 'Advanced usage',
      collapsible: true,
      collapsed: false,
      items: [
        'advanced-callbacks',
      ],
    },
  ],
};
module.exports = sidebars;
