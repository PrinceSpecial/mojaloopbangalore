import fs from "fs";
import FormData from "form-data";
import axios from "axios";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const jobId = body.jobId;

  if (!jobId) {
    return { error: "jobId is required" };
  }

  const filePath = `public/reports/${jobId}.csv`;

  if (!fs.existsSync(filePath)) {
    return { error: "CSV file not found" };
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), {
    filename: `${jobId}.csv`,
    contentType: "text/csv"
  });

  const webhookUrl = "https://n8n.cless.me/webhook/d28eb340-f3e6-49d2-b2c0-b2e752cc3126";

  try {
    const response = await axios.post(webhookUrl, form, {
      headers: {
        ...form.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log("Réponse n8n:", response.data);
    console.log("Status:", response.status);

    return { 
      success: true, 
      response: response.data,
      status: response.status
    };
  } catch (error: any) {
    console.error("Erreur lors de l'envoi:", error.message);
    if (error.response) {
      console.error("Réponse erreur:", error.response.data);
      console.error("Status erreur:", error.response.status);
    }
    return { 
      success: false, 
      error: error.message,
      details: error.response?.data
    };
  }
});