/**
 * The Foundations pages, drawn from the data the token build writes, so the
 * documentation cannot drift from the tokens it documents.
 */
import { tokens as t } from '@deckle/tokens';
import foundations from '@deckle/tokens/foundations.json';
import type { CSSProperties, ReactNode } from 'react';
import styled from 'styled-components';
import { type TypeRole, typeRole } from '../theme/type.ts';

const Table = styled.table`
  inline-size: 100%;
  border-collapse: collapse;
  ${typeRole('bodySmall')}

  th,
  td {
    padding: ${t.space.gapSm} ${t.space.gapMd} ${t.space.gapSm} 0;
    border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
    text-align: start;
    vertical-align: middle;
  }

  th {
    ${typeRole('label')}
    color: ${t.text.secondary};
  }
`;

const Code = styled.code`
  font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
  font-size: 0.8125rem;
  color: ${t.text.secondary};
`;

const Swatch = styled.span`
  display: block;
  inline-size: 100%;
  min-inline-size: 4rem;
  block-size: 2.5rem;
  border-radius: ${t.radius.control};
  box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.subtle};
`;

/** A cell that shows a semantic colour as it resolves in one scheme. */
function Scheme({
  scheme,
  cssVar,
  children,
}: {
  scheme: 'light' | 'dark';
  cssVar: string;
  children: ReactNode;
}) {
  return (
    <td>
      <div
        style={{
          colorScheme: scheme,
          background: t.surface.page,
          padding: t.space.gapXs,
          borderRadius: t.radius.control,
        }}
      >
        <Swatch style={{ background: `var(${cssVar})` }} />
      </div>
      <Code>{children}</Code>
    </td>
  );
}

export function SemanticColours({ group }: { group: string }) {
  const rows = foundations.colours.filter((colour) => colour.token.split('.')[0] === group);
  return (
    <Table>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Light</th>
          <th scope="col">Dark</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((colour) => (
          <tr key={colour.token}>
            <td>
              <Code>{colour.cssVar}</Code>
            </td>
            <Scheme scheme="light" cssVar={colour.cssVar}>
              {colour.light.primitive} · {colour.light.hex}
            </Scheme>
            <Scheme scheme="dark" cssVar={colour.cssVar}>
              {colour.dark.primitive} · {colour.dark.hex}
            </Scheme>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

const PaletteRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
  gap: ${t.space.gapXs};
  margin-block-end: ${t.space.gapLg};
`;

const Step = styled.figure`
  display: grid;
  gap: ${t.space.gap2xs};

  figcaption {
    ${typeRole('caption')}
    color: ${t.text.secondary};
  }
`;

export function Palettes() {
  return foundations.palettes.map((palette) => (
    <section key={palette.palette} aria-label={`${palette.palette} palette`}>
      <h3 style={{ textTransform: 'capitalize' }}>{palette.palette}</h3>
      <PaletteRow>
        {palette.steps.map((step) => (
          <Step key={step.step}>
            <Swatch style={{ background: step.hex }} />
            <figcaption>
              {step.step} · {step.hex}
            </figcaption>
          </Step>
        ))}
      </PaletteRow>
    </section>
  ));
}

const roleNames: Record<string, TypeRole> = {
  display: 'display',
  'heading-1': 'heading1',
  'heading-2': 'heading2',
  'heading-3': 'heading3',
  body: 'body',
  'body-small': 'bodySmall',
  caption: 'caption',
  label: 'label',
  numeral: 'numeral',
};

const Sample = styled.p<{ $role: TypeRole }>`
  ${({ $role }) => typeRole($role)}
  margin-block-end: ${t.space.gap2xs};
`;

export function TypeScale() {
  return (
    <Table>
      <thead>
        <tr>
          <th scope="col">Role</th>
          <th scope="col">Sample</th>
          <th scope="col">Size · weight · leading · tracking</th>
        </tr>
      </thead>
      <tbody>
        {foundations.type.map((role) => {
          const name = roleNames[role.role] ?? 'body';
          return (
            <tr key={role.role}>
              <td>
                <Code>{role.role}</Code>
              </td>
              <td>
                <Sample $role={name}>
                  {name === 'numeral' ? '07 / 50' : 'Melencolia I, 1514'}
                </Sample>
              </td>
              <td>
                <Code>
                  {role.size} · {role.weight} · {role.leading} · {role.tracking}
                </Code>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

interface Entry {
  token: string;
  cssVar: string;
  value: string;
  primitive: string;
}

function Scale({ entries, render }: { entries: Entry[]; render: (entry: Entry) => ReactNode }) {
  return (
    <Table>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Value</th>
          <th scope="col">Shown</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.token}>
            <td>
              <Code>{entry.cssVar}</Code>
            </td>
            <td>
              <Code>
                {entry.value} · {entry.primitive}
              </Code>
            </td>
            <td style={{ inlineSize: '50%' }}>{render(entry)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

const bar: CSSProperties = { blockSize: '0.75rem', background: t.accent.default, borderRadius: 2 };

export const SpaceScale = () => (
  <Scale
    entries={foundations.space}
    render={(e) => <div style={{ ...bar, inlineSize: `var(${e.cssVar})` }} />}
  />
);

export const Radii = () => (
  <Scale
    entries={[...foundations.radius, ...foundations.strokeWidth]}
    render={(e) =>
      e.token.startsWith('radius') ? (
        <div
          style={{
            inlineSize: '5rem',
            blockSize: '3rem',
            borderRadius: `var(${e.cssVar})`,
            border: `${t.strokeWidth.rule} solid ${t.stroke.strong}`,
          }}
        />
      ) : (
        <div
          style={{
            inlineSize: '100%',
            borderBlockStart: `var(${e.cssVar}) solid ${t.stroke.strong}`,
          }}
        />
      )
    }
  />
);

const Mover = styled.div`
  inline-size: 100%;
  block-size: 1rem;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 1rem;
    block-size: 1rem;
    border-radius: ${t.radius.chip};
    background: ${t.accent.default};
    transition-property: inset-inline-start;
    transition-duration: var(--duration);
    transition-timing-function: var(--easing);
  }

  tr:hover &::after {
    inset-inline-start: calc(100% - 1rem);
  }
`;

export const MotionScale = () => (
  <Scale
    entries={foundations.motion}
    render={(e) =>
      e.token === 'motion.easing' ? (
        <Code>Every transition eases with this curve</Code>
      ) : (
        <Mover
          role="img"
          aria-label={`${e.token}, hover the row to play`}
          style={{ '--duration': `var(${e.cssVar})`, '--easing': t.motion.easing }}
        />
      )
    }
  />
);

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(${t.layout.columns}, 1fr);
  gap: ${t.layout.gutter};
  max-inline-size: ${t.layout.maxWidth};
  margin-block: ${t.space.gapLg};

  span {
    block-size: 4rem;
    border-radius: ${t.radius.control};
    background: ${t.accent.subtle};
    box-shadow: inset 0 0 0 ${t.strokeWidth.hairline} ${t.stroke.accent};
  }
`;

export function Grid() {
  return (
    <>
      <Columns aria-hidden="true">
        {Array.from({ length: 12 }, (_, column) => (
          <span key={column} />
        ))}
      </Columns>
      <Scale entries={foundations.layout} render={(e) => <Code>{e.token}</Code>} />
      <Table>
        <thead>
          <tr>
            <th scope="col">Breakpoint</th>
            <th scope="col">Media query</th>
          </tr>
        </thead>
        <tbody>
          {foundations.breakpoints.map((breakpoint) => (
            <tr key={breakpoint.name}>
              <td>
                <Code>{breakpoint.name}</Code>
              </td>
              <td>
                <Code>{breakpoint.query}</Code>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

const Verdict = styled.span<{ $pass: boolean }>`
  ${typeRole('label')}
  color: ${({ $pass }) => ($pass ? t.feedback.success : t.feedback.error)};
`;

export function ContrastTable() {
  const cssVar = (path: string) => `var(--${path.replaceAll('.', '-')})`;
  const sample = (pair: (typeof foundations.contrast)[number], scheme: 'light' | 'dark') => (
    <span
      style={{
        colorScheme: scheme,
        display: 'inline-block',
        padding: `${t.space.gap2xs} ${t.space.gapSm}`,
        borderRadius: t.radius.control,
        background: cssVar(pair.background),
        color: cssVar(pair.foreground),
      }}
    >
      Aa {pair[scheme].toFixed(2)}:1
    </span>
  );
  return (
    <Table>
      <thead>
        <tr>
          <th scope="col">Foreground on background</th>
          <th scope="col">Floor</th>
          <th scope="col">Light</th>
          <th scope="col">Dark</th>
        </tr>
      </thead>
      <tbody>
        {foundations.contrast.map((pair) => (
          <tr key={`${pair.foreground}/${pair.background}`}>
            <td>
              <Code>
                {pair.foreground} on {pair.background}
              </Code>
            </td>
            <td>
              <Verdict $pass={pair.light >= pair.minimum && pair.dark >= pair.minimum}>
                {pair.minimum}:1
              </Verdict>
            </td>
            <td>{sample(pair, 'light')}</td>
            <td>{sample(pair, 'dark')}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
