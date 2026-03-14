export interface FlowPayload {
  flow_token?: string;
  farmer_name?: string;
  age?: string;
  profession?: string;
  state?: string;
  district?: string;
  crop?: string;
  /** Date in ms (DatePicker) or YYYY-MM-DD string */
  advisory_start_date?: string | number;
  [key: string]: unknown;
}

export const parseFlowResponseJson = (responseJson: string): FlowPayload | null => {
  try {
    return JSON.parse(responseJson) as FlowPayload;
  } catch {
    return null;
  }
};

/** Parse advisory_start_date from payload (DatePicker returns ms, or string YYYY-MM-DD) */
function parseAdvisoryStartDate(value: string | number | undefined): Date | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') return new Date(value);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export const extractFarmerData = (payload: FlowPayload) => {
  return {
    farmer_name: payload.farmer_name || '',
    age: payload.age || '',
    profession: payload.profession || '',
    state: payload.state || '',
    district: payload.district || '',
    crop: payload.crop || '',
    advisory_start_date: parseAdvisoryStartDate(payload.advisory_start_date),
    flow_token: payload.flow_token,
  };
};
