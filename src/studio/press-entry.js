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
    defineField({ name: "date", title: "Date", type: "date" }),
    defineField({
      name: "description",
      title: "Our write-up",
      type: "text",
      rows: 8,
      description: "Your own words about this entry. Leave a blank line between paragraphs.",
    }),
    defineField({
      name: "url",
      title: "Main external link",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["https", "http"] }),
    }),
    defineField({
      name: "links",
      title: "More links",
      type: "array",
      of: [defineArrayMember({
        type: "object",
        fields: [
          defineField({ name: "label", type: "string", validation: (rule) => rule.required() }),
          defineField({
            name: "url",
            type: "url",
            validation: (rule) => rule.required().uri({ scheme: ["https", "http", "mailto"] }),
          }),
        ],
        preview: { select: { title: "label", subtitle: "url" } },
      })],
    }),
    defineField({
      name: "photos",
      type: "array",
      of: [defineArrayMember({
        type: "image",
        fields: [
          defineField({ name: "alt", title: "Alt text", type: "string", validation: (rule) => rule.required() }),
          defineField({ name: "caption", type: "string" }),
        ],
      })],
    }),
  ],
});
