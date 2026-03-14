/** Page-level info banners (UI_STANDARDS — GlobalMessageBar). Keyed by route/page ID. */
export const PAGE_INFO_BANNERS: Record<
  string,
  { title: string; description: string }
> = {
  dashboard: {
    title: 'Dashboard',
    description:
      'Overview of farmer registrations and summaries by crop and state. Data updates when the backend syncs.',
  },
  farmers: {
    title: 'Farmers',
    description:
      'Search and filter registered farmers. Use Export CSV to download the current filtered list.',
  },
  reports: {
    title: 'Reports',
    description:
      'View registration breakdowns by crop and state. Charts reflect the same data as the Dashboard summary.',
  },
  config: {
    title: 'Configuration',
    description:
      'Configure WhatsApp Flow invite text and IDs. Saved values override environment variables. The preview shows how the chat invite and flow screens appear to users.',
  },
};
