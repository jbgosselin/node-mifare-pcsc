"use strict";
import gulp from 'gulp';
import babel from 'gulp-babel';
import runSequence from 'run-sequence';

const SOURCES = 'src/**/*.es6';

gulp.task('prepublish', ['babel']);

gulp.task('babel', () => {
  return gulp.src(SOURCES)
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest('lib'));
});

gulp.task('watch', () => gulp.watch(SOURCES, ["babel"]));

gulp.task('default', (cb) => {
  runSequence("babel", "watch", cb);
});
