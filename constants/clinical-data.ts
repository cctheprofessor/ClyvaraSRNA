export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming'
].sort();

export const MAJOR_HOSPITALS_BY_STATE: Record<string, string[]> = {
  'California': [
    'Stanford Health Care',
    'UCLA Medical Center',
    'Cedars-Sinai Medical Center',
    'UC San Diego Health',
    'UCSF Medical Center',
    'USC Keck Hospital',
  ],
  'Florida': [
    'Mayo Clinic - Jacksonville',
    'UF Health Shands Hospital',
    'Tampa General Hospital',
    'Jackson Memorial Hospital',
    'Cleveland Clinic Florida',
  ],
  'Illinois': [
    'Northwestern Memorial Hospital',
    'University of Chicago Medical Center',
    'Rush University Medical Center',
    'Loyola University Medical Center',
  ],
  'Maryland': [
    'Johns Hopkins Hospital',
    'University of Maryland Medical Center',
    'MedStar Georgetown University Hospital',
  ],
  'Massachusetts': [
    'Massachusetts General Hospital',
    'Brigham and Women\'s Hospital',
    'Beth Israel Deaconess Medical Center',
    'Boston Medical Center',
    'Tufts Medical Center',
  ],
  'Michigan': [
    'University of Michigan Hospitals',
    'Henry Ford Hospital',
    'Beaumont Hospital',
  ],
  'Minnesota': [
    'Mayo Clinic - Rochester',
    'University of Minnesota Medical Center',
  ],
  'New York': [
    'NewYork-Presbyterian Hospital',
    'Mount Sinai Hospital',
    'NYU Langone Medical Center',
    'Montefiore Medical Center',
    'Strong Memorial Hospital',
  ],
  'North Carolina': [
    'Duke University Hospital',
    'UNC Medical Center',
    'Wake Forest Baptist Medical Center',
  ],
  'Ohio': [
    'Cleveland Clinic',
    'Ohio State University Wexner Medical Center',
    'University Hospitals Cleveland Medical Center',
  ],
  'Pennsylvania': [
    'Hospital of the University of Pennsylvania',
    'UPMC Presbyterian',
    'Penn State Health Milton S. Hershey Medical Center',
    'Thomas Jefferson University Hospital',
  ],
  'Texas': [
    'MD Anderson Cancer Center',
    'UT Southwestern Medical Center',
    'Houston Methodist Hospital',
    'Baylor University Medical Center',
    'UT Health San Antonio',
  ],
  'Washington': [
    'University of Washington Medical Center',
    'Harborview Medical Center',
    'Swedish Medical Center',
  ],
};
