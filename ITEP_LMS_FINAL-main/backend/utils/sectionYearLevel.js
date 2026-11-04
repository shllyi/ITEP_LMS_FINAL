const SECTION_YEAR_LEVEL = {
  'BSIT 1A': '1st Year',
  'BSIT 1B': '1st Year',
  'BSIT 2A': '2nd Year',
  'BSIT 2B': '2nd Year',
  'BSIT S3A': '3rd Year',
  'BSIT NS3A': '3rd Year',
  'BSIT S4A': '4th Year',
  'BSIT NS4A': '4th Year',
};

const yearLevelFromSection = (section) => SECTION_YEAR_LEVEL[section] || '';

module.exports = { SECTION_YEAR_LEVEL, yearLevelFromSection };