import { defineArrayMember, defineField, defineType } from "sanity";
import { defaultAbout } from "../lib/about-content.js";

export default defineType({
  name: "naraAbout",
  title: "About Us",
  type: "document",
  initialValue: { ...defaultAbout, team: defaultAbout.team.map((member, index) => ({
    ...member, _key: String(index),
  })) },
  fields: [
    defineField({ name: "intro", type: "text", validation: (rule) => rule.required() }),
    defineField({
      name: "team",
      type: "array",
      of: [defineArrayMember({
        type: "object",
        fields: [
          defineField({ name: "name", type: "string", validation: (rule) => rule.required() }),
          defineField({ name: "bio", type: "text", validation: (rule) => rule.required() }),
          defineField({ name: "website", type: "url", validation: (rule) => rule.uri({ scheme: ["https", "http"] }) }),
          defineField({ name: "email", type: "email" }),
        ],
      })],
    }),
  ],
});
