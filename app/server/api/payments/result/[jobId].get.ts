import fs from "fs";
import path from "path";
import { parse } from 'csv-parse';
import { getQuery, createError } from 'h3';

export default defineEventHandler(async (event) => {
    const jobId = event.context.params?.jobId;
    
    const query = getQuery(event);
    const page = parseInt(query.page as string) || 1;
    const pageSize = 10;

    const fromLine = (page - 1) * pageSize;
    const toLine = fromLine + pageSize;

    if(!jobId) throw createError({ statusCode: 400, message: 'Job ID is required' });

    const filePath = path.join(process.cwd(), `public/reports/${jobId}.csv`);

    if (!fs.existsSync(filePath)) {
        throw createError({ statusCode: 404, message: 'Report file not found' });
    }

    const records: Record<string, unknown>[] = [];
    let currentRowIndex = 0;

    const stream = fs.createReadStream(filePath);
    const parser = stream.pipe(parse({
        columns: true,
        skip_empty_lines: true
    }));

    try {
        for await (const record of parser) {
            
            if (currentRowIndex >= fromLine && currentRowIndex < toLine) {
                records.push(record);
            }

            currentRowIndex++;

            if (currentRowIndex >= toLine) {
                stream.destroy();
                break;
            }
        }
    } catch (err) {
        const error = err as { code?: string };

        if (error.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            throw err;
        }
    }

    return {
        page,
        pageSize,
        data: records,
    };
});