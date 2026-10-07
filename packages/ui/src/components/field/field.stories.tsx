import preview from '#storybook/preview';
import { expect } from 'storybook/test';
import { SelectField, TextField } from './field.tsx';

const meta = preview.meta({
  title: 'Components/Field',
  component: TextField,
  args: { label: 'Email', type: 'email', name: 'email', autoComplete: 'email' },
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '26rem' }}>
        <Story />
      </div>
    ),
  ],
});

export const Default = meta.story();

/** Why the field is asked for, read with it. */
export const WithHint = meta.story({
  args: { hint: 'For the receipt. Nothing else is sent to it.' },
});

/** After a try to submit: the border and the reason in the error's red, the reason read with the field. */
export const WithError = meta.story({
  args: {
    defaultValue: 'ana@example',
    error: 'Enter an email address, such as you@example.com',
  },
  globals: { theme: 'light' },
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Email' });
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(
      'Enter an email address, such as you@example.com',
    );
  },
});

/** A choice from a list: the browser's own picker, under the shop's frame and arrow. */
export const Select = meta.story({
  render: () => (
    <SelectField
      label="Country"
      name="country"
      defaultValue="US"
      options={[
        { value: 'US', label: 'United States of America' },
        { value: 'BR', label: 'Brazil' },
        { value: 'JP', label: 'Japan' },
      ]}
    />
  ),
});
