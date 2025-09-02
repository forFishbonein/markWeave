/*
 * @FilePath: schema.js
 * @Author: Aron
 * @Date: 2025-03-04 22:41:56
 * @LastEditors: Please set LastEditors
 * @LastEditTime: 2025-03-04 23:29:24
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
import { Schema } from "prosemirror-model";
// Define ProseMirror Schema
export const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      content: "text*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return ["p", 0];
      },
    },
    text: { group: "inline" },
  },
  marks: {
    bold: {
      parseDOM: [{ tag: "strong" }],
      toDOM() {
        return ["strong", 0];
      },
    },
    em: {
      parseDOM: [{ tag: "i" }, { tag: "em" }],
      toDOM() {
        return ["em", 0];
      },
    },
    link: {
      attrs: {
        href: { default: "" },
      },
      inclusive: false,
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs(dom) {
            return { href: dom.getAttribute("href") };
          },
        },
      ],
      toDOM(node) {
        return ["a", { href: node.attrs.href, class: "link" }, 0];
      },
    },
    // comment: {
    //   attrs: {
    //     id: {},
    //   },
    //   inclusive: false,
    //   parseDOM: [
    //     {
    //       tag: "span.comment",
    //       getAttrs(dom) {
    //         return { id: dom.getAttribute("data-id") };
    //       },
    //     },
    //   ],
    //   toDOM(node) {
    //     return ["span", { "data-id": node.attrs.id, class: "comment" }, 0];
    //   },
    // },
  },
});
