/*
 * @FilePath: babel.config.js
 * @Author: Aron
 * @Date: 2025-07-12 01:34:28
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-07-12 01:35:00
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
module.exports = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: { node: "current" },
      },
    ],
  ],
};
