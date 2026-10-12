import { compile } from '@inlang/paraglide-js';
import { appParaglideConfig } from '../paraglide.config';

const result = await compile(appParaglideConfig);

const fileCount = Object.keys(result.outputHashes ?? {}).length;
console.log(`paraglide: generated ${fileCount} files into ${appParaglideConfig.outdir}`);
