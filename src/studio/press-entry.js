import { defineArrayMember, defineField, defineType } from "sanity";

export default defineType({
  name: "naraPressEntry",
  title: "Press entry",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (rule) => rule.required() }),
    defineField({
      name: "slug",
      type: "slug",
      description: "Use tiat, gazette, lego, md-exhibition, or final-presentation to replace an existing entry.",
      options: { source: "title" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "kind",
      title: "Category",
      type: "string",
      options: { list: ["LinkedIn article", "Article", "Newsletter", "Exhibition", "Presentation"] },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "order", title: "Display order", type: "number", initialValue: 100 }),
    defineField({
      name: "url",
      title: "External link",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["https", "http"] }),
    }),
    defineField({
      name: "photos",
      type: "array",
      description: "Leave the external link blank to show a gallery on the NaRa site.",
      of: [defineArrayMember({
        type: "image",
        fields: [
          defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required() }),
        ],
      })],
    }),
  ],
});
