const {
  input,
  div,
  a,
  text,
  script,
  domReady,
  style,
  ul,
  li,
  h3,
} = require("@saltcorn/markup/tags");

const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");
const Table = require("@saltcorn/data/models/table");
const db = require("@saltcorn/data/db");
const Form = require("@saltcorn/data/models/form");
const Field = require("@saltcorn/data/models/field");
const {
  jsexprToWhere,
  get_expression_function,
} = require("@saltcorn/data/models/expression");
const { InvalidConfiguration } = require("@saltcorn/data/utils");

const get_state_fields = async (table_id) => [];
const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "views",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();
          const dynOrderFieldOptions = [],
            dynSectionFieldOptions = [];

          for (const field of fields) {
            dynOrderFieldOptions.push(field.name);
            if (
              field.type &&
              field.type.name === "String" &&
              field.attributes &&
              field.attributes.options
            )
              dynSectionFieldOptions.push(field.name);
          }

          return new Form({
            fields: [
              {
                name: "section_field",
                label: "Section field",
                type: "String",
                attributes: {
                  options: dynSectionFieldOptions,
                },
              },
              {
                name: "order_field",
                label: "Order field",
                type: "String",
                attributes: {
                  options: dynOrderFieldOptions,
                },
              },

              {
                name: "label_fml",
                label: "Label formula",
                type: "String",
                required: true,
              },
              {
                name: "url_fml",
                label: "URL formula",
                type: "String",
                required: true,
              },
              {
                name: "include_fml",
                label: "Include formula",
                sublabel:
                  "If specified, only include in menu rows that evaluate to true",
                type: "String",
              },
            ],
          });
        },
      },
    ],
  });
const run = async (
  table_id,
  viewname,
  { section_field, order_field, label_fml, url_fml, include_fml },
  state,
  extraArgs
) => {
  const table = Table.findOne(table_id);
  const fields = await table.getFields();
  const where = include_fml ? jsexprToWhere(dyn_include_fml) : {};
  const selopts = order_field ? { orderBy: db.sqlsanitize(order_field) } : {};
  const fLabel = get_expression_function(label_fml, fields);
  const fUrl = get_expression_function(url_fml, fields);
  const rows = await table.getRows(where, selopts);
  const outputRow = (row) => li(a({ href: fUrl(row) }, fLabel(row)));

  if (section_field) {
    const section_fld = fields.find((f) => f.name === section_field);
    if (!section_field)
      throw new InvalidConfiguration(
        `Section field ${dyn_section_field} not found`
      );
    const sections = section_fld.attributes.options
      .split(",")
      .map((s) => s.trim());
    return sections.map((section) =>
      div(
        h3(section),
        ul(rows.filter((r) => r[section_field] === section).map(outputRow))
      )
    );
  } else {
    return ul(rows.map(outputRow));
  }
};

module.exports = {
  sc_plugin_api_version: 1,
  viewtemplates: [
    {
      name: "Table of Contents",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run,
    },
  ],
};
