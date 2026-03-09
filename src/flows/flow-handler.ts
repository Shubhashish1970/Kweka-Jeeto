export interface FlowPayload {
  flow_token?: string;
  farmer_name?: string;
  age?: string;
  profession?: string;
  state?: string;
  district?: string;
  crop?: string;
  [key: string]: unknown;
}

export const parseFlowResponseJson = (responseJson: string): FlowPayload | null => {
  try {
    return JSON.parse(responseJson) as FlowPayload;
  } catch {
    return null;
  }
};

export const extractFarmerData = (payload: FlowPayload) => {
  return {
    farmer_name: payload.farmer_name || '',
    age: payload.age || '',
    profession: payload.profession || '',
    state: payload.state || '',
    district: payload.district || '',
    crop: payload.crop || '',
    flow_token: payload.flow_token,
  };
};
