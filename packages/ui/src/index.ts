// Components: one job each, on the semantic tokens.
export {
  Breadcrumbs,
  type BreadcrumbsProps,
  type Crumb,
} from './components/breadcrumbs/breadcrumbs.tsx';
export {
  Button,
  ButtonLink,
  type ButtonLinkProps,
  type ButtonProps,
  type ButtonVariant,
} from './components/button/button.tsx';
export { Chip, type ChipProps, type ChipTone } from './components/chip/chip.tsx';
export {
  SelectField,
  type SelectFieldProps,
  type SelectOption,
  TextField,
  type TextFieldProps,
} from './components/field/field.tsx';
export { Icon, type IconProps, type IconSize } from './components/icon/icon.tsx';
export { iconNames, type IconName } from './components/icon/icons.tsx';
export {
  IconButton,
  IconLink,
  type IconButtonProps,
  type IconLinkProps,
} from './components/icon-button/icon-button.tsx';
export { Logo, type LogoProps } from './components/logo/logo.tsx';
export { Missing } from './components/missing/missing.tsx';
export { Note, type NoteProps } from './components/note/note.tsx';
export { Price, type PriceProps } from './components/price/price.tsx';
export { Quantity, type QuantityProps } from './components/quantity/quantity.tsx';
export {
  SearchField,
  type SearchFieldProps,
  type SearchSuggestion,
  type SearchSuggestionGroup,
  type SearchSuggestions,
  type SuggestionSource,
} from './components/search-field/search-field.tsx';
export {
  SizeOptions,
  type SizeOption,
  type SizeOptionsProps,
} from './components/size-options/size-options.tsx';
export {
  TextButton,
  type TextButtonProps,
  TextLink,
  type TextLinkProps,
  type TextLinkTone,
} from './components/text-link/text-link.tsx';
export { VisuallyHidden, visuallyHidden } from './components/visually-hidden/visually-hidden.tsx';

// Sections: the bands a page is built from. The screens under src/screens
// compose them with fixture data for review, and are not exported.
export { AddedToCart, type AddedToCartProps } from './sections/added-to-cart.tsx';
export { Announcement, type AnnouncementProps } from './sections/announcement.tsx';
export {
  Band,
  type BandProps,
  type BandTone,
  SectionHead,
  type SectionHeadProps,
} from './sections/band.tsx';
export { BlankProof, type BlankProofProps } from './sections/blank-proof.tsx';
export {
  type Assurance,
  Assurances,
  BuyBox,
  EditionCallout,
  type EditionCalloutProps,
  PriceRule,
  WorkHeading,
  type WorkHeadingProps,
} from './sections/buy-box.tsx';
export {
  CartLine,
  type CartLineProps,
  CartLines,
  OrderSummary,
  type OrderSummaryProps,
  type SummaryRow,
} from './sections/cart.tsx';
export {
  CheckoutForm,
  ChoiceCard,
  type ChoiceCardProps,
  FieldPair,
  FormSection,
  type FormSectionProps,
  PanelNote,
  type PanelNoteProps,
} from './sections/checkout.tsx';
export { CollectionRow, type CollectionRowProps } from './sections/collection-row.tsx';
export { type Detail, placement } from './sections/detail.ts';
export { DetailImage, type DetailImageProps } from './sections/detail-image.tsx';
export { DropRow, type DropRowProps } from './sections/drop-row.tsx';
export {
  Copies,
  CopiesKey,
  type CopiesKeyProps,
  type CopiesProps,
  type CopyState,
  Countdown,
  type CountdownProps,
  EditionFacts,
  type EditionFactsProps,
  Tally,
  type TallyProps,
} from './sections/edition.tsx';
export {
  type FilterGroup,
  type FilterOption,
  Filters,
  type FiltersProps,
} from './sections/filters.tsx';
export { PageHead, type PageHeadProps } from './sections/page-head.tsx';
export {
  PasskeyDialog,
  type PasskeyDialogProps,
  type PasskeyStep,
} from './sections/passkey-dialog.tsx';
export { PrintGrid, PrintTile, type PrintTileProps } from './sections/print-tile.tsx';
export { Record, type RecordEntry, type RecordProps } from './sections/record.tsx';
export { type FooterColumn, SiteFooter, type SiteFooterProps } from './sections/site-footer.tsx';
export { type NavItem, SiteHeader, type SiteHeaderProps } from './sections/site-header.tsx';
export { type DiagramSize, SizeDiagram, type SizeDiagramProps } from './sections/size-diagram.tsx';
export { type SizeRow, SizeTable, type SizeTableProps } from './sections/size-table.tsx';
export { Stage, type StageImage, type StageProps, TrimMarks } from './sections/stage.tsx';
export { Steps, type StepsProps } from './sections/steps.tsx';
export { Story, type StoryFigure, type StoryProps } from './sections/story.tsx';
export {
  StoryCard,
  type StoryCardProps,
  StoryGrid,
  StoryLead,
  type StoryLeadProps,
} from './sections/story-card.tsx';
export { type Thumbnail, Thumbnails, type ThumbnailsProps } from './sections/thumbnails.tsx';

export { formatCentimetres, formatMoney, formatPpi, MISSING, type Centimetres } from './format.ts';
export { typeRole, type TypeRole } from './theme/type.ts';
