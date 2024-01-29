import * as t from 'io-ts';


export const EntityPropertyType = t.intersection([
  t.type({
    name: t.string,
    type: t.keyof({
      string: null,
      number: null,
      boolean: null,
      datetime: null,
      text: null,
      file: null,
      image: null,
    }),
  }),
  t.partial({
    primaryKey: t.boolean,
    reference: t.string,
  }),
]);

export const EntityType = t.type({
  name: t.string,
  properties: t.array(EntityPropertyType),
});

export const NavbarConfigType = t.type({
  items: t.array(t.string),
});

export const PageOverrideConfigType = t.record(t.string, t.type({
  show_fields: t.array(t.string),
  allow_create: t.boolean,
  allow_read: t.boolean,
  allow_update: t.boolean,
  allow_delete: t.boolean,
}));

export interface Entity extends t.TypeOf<typeof EntityType> {}
export interface NavbarConfig extends t.TypeOf<typeof NavbarConfigType> {}
export interface PageOverrideConfig extends t.TypeOf<typeof PageOverrideConfigType> {}
