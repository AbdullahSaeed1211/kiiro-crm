export type Vertical =
  | 'Dental'
  | 'Legal'
  | 'Real estate'
  | 'Restaurant'
  | 'E-commerce'
  | 'SaaS'
  | 'Fitness'
  | 'Education'
  | 'Healthcare'
  | 'Construction'
  | 'Logistics'
  | 'Nonprofit'

const ECOMMERCE: Vertical = 'E-commerce'

export interface DemoCompany {
  readonly name: string
  readonly vertical: Vertical
  readonly city: string
}

/** Fictional clients and prospects across twelve verticals; all domains are reserved example domains. */
export const COMPANIES: readonly DemoCompany[] = [
  { name: 'Brightside Dental', vertical: 'Dental', city: 'Austin' },
  { name: 'Harborview Family Dentistry', vertical: 'Dental', city: 'Portland' },
  { name: 'Pearl & Co Orthodontics', vertical: 'Dental', city: 'Denver' },
  { name: 'Whitfield & Moore LLP', vertical: 'Legal', city: 'Chicago' },
  { name: 'Calloway Injury Law', vertical: 'Legal', city: 'Atlanta' },
  { name: 'Sterling Estate Planning', vertical: 'Legal', city: 'Boston' },
  { name: 'Keystone Realty Group', vertical: 'Real estate', city: 'Philadelphia' },
  { name: 'Bayfront Properties', vertical: 'Real estate', city: 'Tampa' },
  { name: 'Oakridge Homes', vertical: 'Real estate', city: 'Nashville' },
  { name: 'Saffron Table', vertical: 'Restaurant', city: 'Seattle' },
  { name: 'The Copper Kettle', vertical: 'Restaurant', city: 'Minneapolis' },
  { name: 'Nonna Rosa Trattoria', vertical: 'Restaurant', city: 'New Orleans' },
  { name: 'Loom & Thread', vertical: ECOMMERCE, city: 'Brooklyn' },
  { name: 'Peak Outdoor Supply', vertical: ECOMMERCE, city: 'Boulder' },
  { name: 'Moonlit Candles', vertical: ECOMMERCE, city: 'Savannah' },
  { name: 'Verdant Skincare', vertical: ECOMMERCE, city: 'San Diego' },
  { name: 'Quillbase', vertical: 'SaaS', city: 'San Francisco' },
  { name: 'Ledgerline', vertical: 'SaaS', city: 'Toronto' },
  { name: 'Fleetwise Software', vertical: 'SaaS', city: 'Dublin' },
  { name: 'Northstar Fitness', vertical: 'Fitness', city: 'Phoenix' },
  { name: 'Iron & Oak Gym', vertical: 'Fitness', city: 'Columbus' },
  { name: 'Lotus Yoga Collective', vertical: 'Fitness', city: 'Asheville' },
  { name: 'Riverbend Academy', vertical: 'Education', city: 'Raleigh' },
  { name: 'Summit Tutoring', vertical: 'Education', city: 'Salt Lake City' },
  { name: 'Codeway Bootcamp', vertical: 'Education', city: 'Austin' },
  { name: 'Clearwater Physiotherapy', vertical: 'Healthcare', city: 'Sacramento' },
  { name: 'Evergreen Pediatrics', vertical: 'Healthcare', city: 'Madison' },
  { name: 'Mindful Path Counseling', vertical: 'Healthcare', city: 'Burlington' },
  { name: 'Granite State Builders', vertical: 'Construction', city: 'Manchester' },
  { name: 'Lakeshore Roofing', vertical: 'Construction', city: 'Milwaukee' },
  { name: 'Ironclad Remodeling', vertical: 'Construction', city: 'Dallas' },
  { name: 'Meridian Freight', vertical: 'Logistics', city: 'Memphis' },
  { name: 'Swift Lane Couriers', vertical: 'Logistics', city: 'Newark' },
  { name: 'Harvest Hands Food Bank', vertical: 'Nonprofit', city: 'Kansas City' },
  { name: 'Open Door Foundation', vertical: 'Nonprofit', city: 'Pittsburgh' },
  { name: 'Coastal Clean Initiative', vertical: 'Nonprofit', city: 'Charleston' },
]

/** What a lead from each vertical usually asks an agency for. */
export const SERVICES_BY_VERTICAL: Readonly<Record<Vertical, readonly string[]>> = {
  Dental: ['Website redesign', 'Local SEO', 'Online booking setup'],
  Legal: ['Website redesign', 'Lead generation ads', 'Brand refresh'],
  'Real estate': ['Listings website', 'Paid social campaign', 'Video tours'],
  Restaurant: ['Website and online ordering', 'Social media management', 'Photography'],
  'E-commerce': ['Store redesign', 'Email marketing', 'Paid ads'],
  SaaS: ['Marketing site', 'Product launch campaign', 'Content and SEO'],
  Fitness: ['Membership website', 'Social media management', 'Paid ads'],
  Education: ['Enrollment website', 'Email campaigns', 'Brand refresh'],
  Healthcare: ['Patient-friendly website', 'Local SEO', 'Appointment flow'],
  Construction: ['Project portfolio site', 'Local SEO', 'Lead forms'],
  Logistics: ['Quote request portal', 'Brand refresh', 'Content and SEO'],
  Nonprofit: ['Donation website', 'Email campaigns', 'Annual report design'],
}
