import * as awsServices from '../utility/awsServices.js'


export const downloadFile = async (req,res) => {
    const { url } = req.query
    try {
        if (!url){
            res.status(400).send("url is required");
        }
        const result = await awsServices.downloadFile(url);
        res.status(200).send(result);
    } catch (error) {
        console.error(`Error in getting imagr${url}`, error);
        res.status(500).send("Internal Server Error");
    }
};