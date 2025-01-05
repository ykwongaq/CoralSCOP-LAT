const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));

// Path to your SCSS files
const paths = {
  scss: "scss/**/*.scss",
  css: "css/",
};

// Task to compile SCSS to CSS
function style() {
  return gulp
    .src(paths.scss) // Source of SCSS files
    .pipe(sass().on("error", sass.logError)) // Compile and handle errors
    .pipe(gulp.dest(paths.css)); // Output to CSS directory
}

// Watch task
function watch() {
  gulp.watch(paths.scss, style); // Watch for changes in SCSS files
}

// Export tasks
exports.style = style;
exports.watch = watch;
