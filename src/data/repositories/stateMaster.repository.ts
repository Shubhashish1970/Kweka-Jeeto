import { StateMaster, IStateMaster } from '../models/StateMaster';

// ---------------------------------------------------------------------------
// 5-minute in-memory cache
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000;
let allCache: { docs: IStateMaster[]; expiresAt: number } | null = null;
const districtCache = new Map<string, { districts: string[]; expiresAt: number }>();

function invalidateAll(): void {
  allCache = null;
  districtCache.clear();
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const getAllStateMasters = async (): Promise<IStateMaster[]> => {
  if (allCache && Date.now() < allCache.expiresAt) return allCache.docs;
  const docs = await StateMaster.find().sort({ stateLabel: 1 }).lean() as unknown as IStateMaster[];
  allCache = { docs, expiresAt: Date.now() + CACHE_TTL_MS };
  return docs;
};

export const getStateMaster = async (state: string): Promise<IStateMaster | null> => {
  const cached = districtCache.get(state);
  if (cached && Date.now() < cached.expiresAt) {
    const all = await getAllStateMasters();
    return all.find((d) => d.state === state) ?? null;
  }
  return StateMaster.findOne({ state }).lean() as unknown as IStateMaster | null;
};

export const getDistrictsByState = async (state: string): Promise<string[]> => {
  const cached = districtCache.get(state);
  if (cached && Date.now() < cached.expiresAt) return cached.districts;
  const doc = await StateMaster.findOne({ state }, { districts: 1 }).lean() as unknown as IStateMaster | null;
  const districts = doc?.districts ?? [];
  districtCache.set(state, { districts, expiresAt: Date.now() + CACHE_TTL_MS });
  return districts;
};

export const createStateMaster = async (
  state: string,
  stateLabel: string,
  districts: string[] = []
): Promise<IStateMaster> => {
  const doc = await StateMaster.create({ state, stateLabel, districts, active: true });
  invalidateAll();
  return doc.toObject() as unknown as IStateMaster;
};

export const updateStateMaster = async (
  state: string,
  updates: Partial<Pick<IStateMaster, 'stateLabel' | 'active'>>
): Promise<IStateMaster | null> => {
  const doc = await StateMaster.findOneAndUpdate(
    { state },
    { $set: updates },
    { new: true }
  ).lean() as unknown as IStateMaster | null;
  invalidateAll();
  return doc;
};

export const deleteStateMaster = async (state: string): Promise<boolean> => {
  const result = await StateMaster.deleteOne({ state });
  invalidateAll();
  return result.deletedCount > 0;
};

export const addDistrict = async (state: string, district: string): Promise<IStateMaster | null> => {
  const doc = await StateMaster.findOneAndUpdate(
    { state },
    { $addToSet: { districts: district } },
    { new: true }
  ).lean() as unknown as IStateMaster | null;
  invalidateAll();
  return doc;
};

export const removeDistrict = async (state: string, district: string): Promise<IStateMaster | null> => {
  const doc = await StateMaster.findOneAndUpdate(
    { state },
    { $pull: { districts: district } },
    { new: true }
  ).lean() as unknown as IStateMaster | null;
  invalidateAll();
  return doc;
};

export const replaceDistricts = async (state: string, districts: string[]): Promise<IStateMaster | null> => {
  const sorted = [...districts].sort((a, b) => a.localeCompare(b));
  const doc = await StateMaster.findOneAndUpdate(
    { state },
    { $set: { districts: sorted } },
    { new: true }
  ).lean() as unknown as IStateMaster | null;
  invalidateAll();
  return doc;
};

// ---------------------------------------------------------------------------
// Seed — runs once on boot, never overwrites existing data
// ---------------------------------------------------------------------------

export const SEED_STATE_MASTERS: Array<{ state: string; stateLabel: string; districts: string[] }> = [
  {
    state: 'andhra_pradesh', stateLabel: 'Andhra Pradesh',
    districts: ['Alluri Sitharama Raju','Anakapalli','Anantapur','Annamayya','Bapatla','Chittoor','East Godavari','Eluru','Guntur','Kadapa','Kakinada','Konaseema','Krishna','Kurnool','Nandyal','Nellore','NTR','Palnadu','Parvathipuram Manyam','Prakasam','Srikakulam','Sri Sathya Sai','Tirupati','Visakhapatnam','Vizianagaram','West Godavari'],
  },
  {
    state: 'bihar', stateLabel: 'Bihar',
    districts: ['Araria','Arwal','Aurangabad','Banka','Begusarai','Bhagalpur','Bhojpur','Buxar','Darbhanga','East Champaran','Gaya','Gopalganj','Jamui','Jehanabad','Kaimur','Katihar','Khagaria','Kishanganj','Lakhisarai','Madhepura','Madhubani','Munger','Muzaffarpur','Nalanda','Nawada','Patna','Purnia','Rohtas','Saharsa','Samastipur','Saran','Sheikhpura','Sheohar','Sitamarhi','Siwan','Supaul','Vaishali','West Champaran'],
  },
  {
    state: 'gujarat', stateLabel: 'Gujarat',
    districts: ['Ahmedabad','Amreli','Anand','Aravalli','Banaskantha','Bharuch','Bhavnagar','Botad','Chhota Udaipur','Dahod','Dang','Devbhoomi Dwarka','Gandhinagar','Gir Somnath','Jamnagar','Junagadh','Kheda','Kutch','Mahisagar','Mehsana','Morbi','Narmada','Navsari','Panchmahal','Patan','Porbandar','Rajkot','Sabarkantha','Surat','Surendranagar','Tapi','Vadodara','Valsad'],
  },
  {
    state: 'haryana', stateLabel: 'Haryana',
    districts: ['Ambala','Bhiwani','Charkhi Dadri','Faridabad','Fatehabad','Gurugram','Hisar','Jhajjar','Jind','Kaithal','Karnal','Kurukshetra','Mahendragarh','Nuh','Palwal','Panchkula','Panipat','Rewari','Rohtak','Sirsa','Sonipat','Yamunanagar'],
  },
  {
    state: 'karnataka', stateLabel: 'Karnataka',
    districts: ['Bagalkot','Ballari','Belagavi','Bengaluru Rural','Bengaluru Urban','Bidar','Chamarajanagar','Chikkaballapura','Chikkamagaluru','Chitradurga','Dakshina Kannada','Davanagere','Dharwad','Gadag','Hassan','Haveri','Kalaburagi','Kodagu','Kolar','Koppal','Mandya','Mysuru','Raichur','Ramanagara','Shivamogga','Tumakuru','Udupi','Uttara Kannada','Vijayapura','Yadgir'],
  },
  {
    state: 'kerala', stateLabel: 'Kerala',
    districts: ['Alappuzha','Ernakulam','Idukki','Kannur','Kasaragod','Kollam','Kottayam','Kozhikode','Malappuram','Palakkad','Pathanamthitta','Thiruvananthapuram','Thrissur','Wayanad'],
  },
  {
    state: 'madhya_pradesh', stateLabel: 'Madhya Pradesh',
    districts: ['Agar Malwa','Alirajpur','Anuppur','Ashoknagar','Balaghat','Barwani','Betul','Bhind','Bhopal','Burhanpur','Chhatarpur','Chhindwara','Damoh','Datia','Dewas','Dhar','Dindori','Guna','Gwalior','Harda','Hoshangabad','Indore','Jabalpur','Jhabua','Katni','Khandwa','Khargone','Mandla','Mandsaur','Morena','Narsinghpur','Neemuch','Niwari','Panna','Raisen','Rajgarh','Ratlam','Rewa','Sagar','Satna','Sehore','Seoni','Shahdol','Shajapur','Sheopur','Shivpuri','Sidhi','Singrauli','Tikamgarh','Ujjain','Umaria','Vidisha'],
  },
  {
    state: 'maharashtra', stateLabel: 'Maharashtra',
    districts: ['Ahmednagar','Akola','Amravati','Aurangabad','Beed','Bhandara','Buldhana','Chandrapur','Dhule','Gadchiroli','Gondia','Hingoli','Jalgaon','Jalna','Kolhapur','Latur','Mumbai City','Mumbai Suburban','Nagpur','Nanded','Nandurbar','Nashik','Osmanabad','Palghar','Parbhani','Pune','Raigad','Ratnagiri','Sangli','Satara','Sindhudurg','Solapur','Thane','Wardha','Washim','Yavatmal'],
  },
  {
    state: 'punjab', stateLabel: 'Punjab',
    districts: ['Amritsar','Barnala','Bathinda','Faridkot','Fatehgarh Sahib','Fazilka','Ferozepur','Gurdaspur','Hoshiarpur','Jalandhar','Kapurthala','Ludhiana','Mansa','Moga','Mohali','Muktsar','Nawanshahr','Pathankot','Patiala','Rupnagar','Sangrur','Tarn Taran'],
  },
  {
    state: 'rajasthan', stateLabel: 'Rajasthan',
    districts: ['Ajmer','Alwar','Banswara','Baran','Barmer','Bharatpur','Bhilwara','Bikaner','Bundi','Chittorgarh','Churu','Dausa','Dholpur','Dungarpur','Hanumangarh','Jaipur','Jaisalmer','Jalore','Jhalawar','Jhunjhunu','Jodhpur','Karauli','Kota','Nagaur','Pali','Pratapgarh','Rajsamand','Sawai Madhopur','Sikar','Sirohi','Sri Ganganagar','Tonk','Udaipur'],
  },
  {
    state: 'tamil_nadu', stateLabel: 'Tamil Nadu',
    districts: ['Ariyalur','Chengalpattu','Chennai','Coimbatore','Cuddalore','Dharmapuri','Dindigul','Erode','Kallakurichi','Kanchipuram','Kanyakumari','Karur','Krishnagiri','Madurai','Mayiladuthurai','Nagapattinam','Namakkal','Nilgiris','Perambalur','Pudukkottai','Ramanathapuram','Ranipet','Salem','Sivaganga','Tenkasi','Thanjavur','Theni','Thoothukudi','Tiruchirappalli','Tirunelveli','Tirupathur','Tiruppur','Tiruvallur','Tiruvannamalai','Tiruvarur','Vellore','Villupuram','Virudhunagar'],
  },
  {
    state: 'telangana', stateLabel: 'Telangana',
    districts: ['Adilabad','Bhadradri Kothagudem','Hanumakonda','Hyderabad','Jagtial','Jangaon','Jayashankar Bhupalpally','Jogulamba Gadwal','Kamareddy','Karimnagar','Khammam','Kumuram Bheem','Mahabubabad','Mahabubnagar','Mancherial','Medak','Medchal-Malkajgiri','Mulugu','Nagarkurnool','Nalgonda','Narayanpet','Nirmal','Nizamabad','Peddapalli','Rajanna Sircilla','Ranga Reddy','Sangareddy','Siddipet','Suryapet','Vikarabad','Wanaparthy','Warangal','Yadadri Bhuvanagiri'],
  },
  {
    state: 'uttar_pradesh', stateLabel: 'Uttar Pradesh',
    districts: ['Agra','Aligarh','Ambedkar Nagar','Amethi','Amroha','Auraiya','Ayodhya','Azamgarh','Baghpat','Bahraich','Ballia','Balrampur','Banda','Barabanki','Bareilly','Basti','Bhadohi','Bijnor','Budaun','Bulandshahr','Chandauli','Chitrakoot','Deoria','Etah','Etawah','Farrukhabad','Fatehpur','Firozabad','Gautam Buddha Nagar','Ghaziabad','Ghazipur','Gonda','Gorakhpur','Hamirpur','Hapur','Hardoi','Hathras','Jalaun','Jaunpur','Jhansi','Kannauj','Kanpur Dehat','Kanpur Nagar','Kasganj','Kaushambi','Lakhimpur Kheri','Lalitpur','Lucknow','Maharajganj','Mahoba','Mainpuri','Mathura','Mau','Meerut','Mirzapur','Moradabad','Muzaffarnagar','Pilibhit','Pratapgarh','Prayagraj','Raebareli','Rampur','Saharanpur','Sambhal','Sant Kabir Nagar','Shahjahanpur','Shamli','Shravasti','Siddharthnagar','Sitapur','Sonbhadra','Sultanpur','Unnao','Varanasi'],
  },
  {
    state: 'west_bengal', stateLabel: 'West Bengal',
    districts: ['Alipurduar','Bankura','Birbhum','Cooch Behar','Dakshin Dinajpur','Darjeeling','Hooghly','Howrah','Jalpaiguri','Jhargram','Kalimpong','Kolkata','Malda','Murshidabad','Nadia','North 24 Parganas','Paschim Bardhaman','Paschim Medinipur','Purba Bardhaman','Purba Medinipur','Purulia','South 24 Parganas','Uttar Dinajpur'],
  },
];

export const seedStateMasters = async (): Promise<void> => {
  await Promise.all(
    SEED_STATE_MASTERS.map(({ state, stateLabel, districts }) =>
      StateMaster.updateOne(
        { state },
        { $setOnInsert: { state, stateLabel, districts, active: true } },
        { upsert: true }
      )
    )
  );
};
