const gulp = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const using = require('gulp-using');
const rename = require("gulp-rename");

gulp.task('default', ['css']);

gulp.task('css', function () {
    return gulp.src(['./style.scss'])
        .pipe(using())
        .pipe(plumber({
            errorHandler: notify.onError("Error: <%= error.message %>")
        }))
        .pipe(sass())
        .pipe(rename(function(path) {
            path.extname = '.css';
            path.basename = 'style';
        }))
        .pipe(gulp.dest('./'));
});