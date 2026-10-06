/**
 * The token files keep the layout of Figma's native DTCG export: one file per
 * collection, each mode of a collection in a file of its own. Style Dictionary
 * merges every file into one tree, where `radius.control` the primitive and
 * `radius.control` the role would collide, so each file is read into its own
 * namespace, and the aliases that point into the primitives follow it there.
 */
export const collections = {
  'primitives.tokens.json': 'primitive',
  'semantic.light.tokens.json': 'light',
  'semantic.dark.tokens.json': 'dark',
  'roles.tokens.json': 'role',
} as const;

export type Collection = (typeof collections)[keyof typeof collections];

/** The namespace a token file is read into, or undefined for a file that is not ours. */
export function collectionOf(filePath: string): Collection | undefined {
  const file = filePath.split(/[\\/]/).at(-1) ?? '';
  return file in collections ? collections[file as keyof typeof collections] : undefined;
}

type Tree = Record<string, unknown>;

/** Points every `{alias}` in a tree at the primitives' namespace. */
export function aliasIntoPrimitives(tree: Tree): Tree {
  const rewrite = (node: unknown): unknown => {
    if (typeof node === 'string') {
      return node.replace(/\{([^}]+)\}/g, (_match, path: string) => `{primitive.${path}}`);
    }
    if (Array.isArray(node)) {
      return node.map(rewrite);
    }
    if (node !== null && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, rewrite(value)]));
    }
    return node;
  };
  return rewrite(tree) as Tree;
}

/** A token file's contents, in the namespace of its collection. */
export function namespaced(filePath: string, contents: string): Tree {
  const collection = collectionOf(filePath);
  const tree = JSON.parse(contents) as Tree;
  if (collection === undefined) {
    throw new Error(`Not a token collection: ${filePath}`);
  }
  return { [collection]: collection === 'primitive' ? tree : aliasIntoPrimitives(tree) };
}
