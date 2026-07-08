import mongoose, { Schema } from 'mongoose'

const jsonOptions = {
  minimize: false,
  toJSON: {
    versionKey: false,
    transform(_doc: unknown, ret: Record<string, unknown>) {
      delete ret._id
      return ret
    },
  },
}

const PartySchema = new Schema(
  {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    taxId: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
  },
  { _id: false },
)

const TaskSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: '' },
    note: { type: String, default: '' },
    pert: { type: Boolean, default: false },
    optimistic: { type: Number, default: 0 },
    likely: { type: Number, default: 0 },
    pessimistic: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
  },
  { _id: false },
)

const SectionSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, default: '' },
    rate: { type: Number, default: 0 },
    tasks: { type: [TaskSchema], default: [] },
  },
  { _id: false },
)

const AdjustmentsSchema = new Schema(
  {
    managementMode: { type: String, enum: ['fixed', 'percent'], default: 'fixed' },
    managementValue: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
  },
  { _id: false },
)

const LineSchema = new Schema(
  {
    id: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
  },
  { _id: false },
)

export const Profile = mongoose.model(
  'Profile',
  new Schema(
    {
      id: { type: String, required: true, unique: true },
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      taxId: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      logo: { type: String, default: '' },
      currency: { type: String, default: 'US$' },
      defaultTaxRate: { type: Number, default: 0 },
      defaultValidity: { type: String, default: '7 días' },
      invoiceFootnote: { type: String, default: '' },
    },
    jsonOptions,
  ),
)

export const Client = mongoose.model(
  'Client',
  new Schema(
    {
      id: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      company: { type: String, default: '' },
      address: { type: String, default: '' },
      taxId: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      notes: { type: String, default: '' },
      createdAt: { type: String, default: '' },
    },
    jsonOptions,
  ),
)

export const Quote = mongoose.model(
  'Quote',
  new Schema(
    {
      id: { type: String, required: true, unique: true },
      number: { type: String, required: true },
      clientId: { type: String, default: null },
      client: { type: PartySchema, default: () => ({}) },
      title: { type: String, default: '' },
      date: { type: String, default: '' },
      validity: { type: String, default: '' },
      currency: { type: String, default: 'US$' },
      sections: { type: [SectionSchema], default: [] },
      adjustments: { type: AdjustmentsSchema, default: () => ({}) },
      status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
      createdAt: { type: String, default: '' },
      updatedAt: { type: String, default: '' },
    },
    jsonOptions,
  ),
)

export const Invoice = mongoose.model(
  'Invoice',
  new Schema(
    {
      id: { type: String, required: true, unique: true },
      number: { type: String, required: true },
      quoteId: { type: String, default: null },
      clientId: { type: String, default: null },
      client: { type: PartySchema, default: () => ({}) },
      date: { type: String, default: '' },
      dueDate: { type: String, default: '' },
      currency: { type: String, default: 'US$' },
      lines: { type: [LineSchema], default: [] },
      discount: { type: Number, default: 0 },
      taxRate: { type: Number, default: 0 },
      notes: { type: String, default: '' },
      status: { type: String, enum: ['draft', 'sent', 'paid'], default: 'draft' },
      createdAt: { type: String, default: '' },
      updatedAt: { type: String, default: '' },
    },
    jsonOptions,
  ),
)

export const Revision = mongoose.model(
  'Revision',
  new Schema(
    {
      entity: { type: String, required: true, index: true },
      entityId: { type: String, required: true, index: true },
      action: { type: String, enum: ['create', 'update', 'delete'], required: true },
      at: { type: String, required: true },
      snapshot: { type: Schema.Types.Mixed, required: true },
    },
    jsonOptions,
  ),
)
