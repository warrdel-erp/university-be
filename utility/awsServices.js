import s3 from './s3.js';
import moment from 'moment';

export const uploadFile = async (file) => {
  const date = moment().format('YYYYMMDD_HHmmss');
  const params = {
    Bucket: 'warrdel-erp',
    Key: 'university/' + 'dev/' + date + file.name,
    Body: file.data
    // ACL: 'public-read'
  };
  return new Promise(async (resolve, reject) => {
    s3.upload(params, async (error, data) => {
      if (error) {
        console.log(`In Error while uploading ${error}`);
        reject(error);
      }
      resolve(data);
    });
  })
};

export const downloadFile = async (url) => {
  const params = {
    Bucket: 'warrdel-erp',
    Key: url.split('https://warrdel-erp.s3.amazonaws.com/')[1]
  };
  const result = await s3.getObject(params).promise();
  const data = { key: url.split('/').slice(-1)[0], body: result.Body };
  return data
};