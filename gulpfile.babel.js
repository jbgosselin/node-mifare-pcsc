"use strict";
import gulp from 'gulp';
import babel from 'gulp-babel';

gulp.task('prepublish', ['default']);

gulp.task('default', () => {
  return gulp.src('src/index.es6')
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest('lib'));
});
