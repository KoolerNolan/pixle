/* jshint node: true */

import gulp from 'gulp';
import path from 'path';
import { fileURLToPath } from 'url';
import rename from 'gulp-rename';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import cleanCSS from 'gulp-clean-css';
import sourcemaps from 'gulp-sourcemaps';
import autoprefixer from 'gulp-autoprefixer';
import svgmin from 'gulp-svgmin';
import plumber from 'gulp-plumber';
import { deleteAsync } from 'del';

const sass = gulpSass(dartSass);

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
Paths: ----------------------------------------------------------
*/

const PIXLE_GAME_SRC_PATH = `${__dirname}/src/`;
const PIXLE_GAME_ASSETS_PATH = `${PIXLE_GAME_SRC_PATH}assets/`;
const DEV_SRC_PATH = `${__dirname}/local/`;

// SVG paths
const PIXLE_GAME_SVG_FOLDER = `${PIXLE_GAME_ASSETS_PATH}svg/`;

// Style paths
const STYLES_SRC_FILES = `${DEV_SRC_PATH}stylesheets/scss/**/!(_*)*.scss`;
const PIXLE_GAME_STYLES_MIN_DEST_PATH = `${PIXLE_GAME_SRC_PATH}stylesheets/css/`;

// Stylesheets deletion pattern
const STYLES_DEL_PATTERN = [
  `${PIXLE_GAME_STYLES_MIN_DEST_PATH}**/*`,
  `!${PIXLE_GAME_SRC_PATH}stylesheets/.gitkeep`,
  `!${PIXLE_GAME_SRC_PATH}stylesheets/README.md`
];

/*
Clear assets/stylesheets folder: --------------------------------
*/

async function clearStyles(pattern) {
  return deleteAsync(pattern).then(deletedFilePaths => {
    console.log('Deleted files:\n', deletedFilePaths.join('\n'));
  });
}

gulp.task('clear', async function() {
  await clearStyles(STYLES_DEL_PATTERN);
  return console.log("Clearing files...");
});

/*
Convert to CSS: -------------------------------------------------
*/

async function toCSS(source, dest) {
  'use strict';
  console.log("Convert scss files to css files...");
  return gulp.src(source)
    .pipe(plumber())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sass(null, false).on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(dest));
}

/*
Uglify / Clean CSS: ----------------------------------------------
*/

async function uglifyCSS(dest) {
  'use strict';
  console.log("Minify css files...");
  return new Promise((resolve) => {
    gulp.src(`${dest}**/!(*.min).css`)
      .pipe(plumber())
      .pipe(cleanCSS({ debug: true }, (details) => {
        console.log(`Original Size : ${details.name} : ${details.stats.originalSize} bytes`);
        console.log(`Minified Size : ${details.name} : ${details.stats.minifiedSize} bytes`);
      }))
      .pipe(rename((path) => {
        if (!path.extname.endsWith('.map')) {
          path.basename += '.min';
        }
      }))
      .pipe(gulp.dest(dest))
      .on('end', resolve);
  });
}

/*
Compress normal stylesheets: -------------------------------------
*/

gulp.task('default-stylesheets', async function() {
  return toCSS(STYLES_SRC_FILES, PIXLE_GAME_STYLES_MIN_DEST_PATH)
    .then(() => uglifyCSS(PIXLE_GAME_STYLES_MIN_DEST_PATH));
});

/*
Compress SVG files: ----------------------------------------------
*/

gulp.task('svg-compress', () => {
  return gulp.src(`${PIXLE_GAME_SVG_FOLDER}**/*.svg`)
    .pipe(plumber())
    .pipe(svgmin())
    .pipe(gulp.dest(PIXLE_GAME_SVG_FOLDER));
});

/*
Compress Task: ---------------------------------------------------
*/

gulp.task('compress', gulp.series('clear', 'default-stylesheets'));

export default function (localGulp) {
  localGulp.task('pixle-game-compress', gulp.series('clear', 'default-stylesheets'));
};

/*
Default Task: ----------------------------------------------------
*/

gulp.task('watch', () => {
  gulp.watch(STYLES_SRC_FILES, gulp.series('compress'));
});

gulp.task('default', gulp.series('compress', 'watch'));
