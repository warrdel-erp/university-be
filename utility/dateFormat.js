import moment from 'moment';

export function parseCustomDate(dateString) {
    console.log(`>>>>>>>>dateString`,dateString);
    
  if (!dateString) return null;

  let formatted = moment(dateString, 'DD-MM-YYYY', true);
  
  if (!formatted.isValid()) {
      formatted = moment(dateString, 'YYYY-MM-DD', true);
      console.log(`>>>>>formatted>>>>`,formatted);
  }

  if (!formatted.isValid()) return null;
  
  
  const date =  formatted.format('DD-MM-YYYY');
  console.log(`>>>>>>date>>>>>>>>`,date);
  return date
}
