exports.doc = 'The Foo module is a demonstration of script modules.' +
'\n It contains a foo function that returns a greeting string. ' +
'\n It also contains a bar object representing the current date.' +
'\n' +
'\n foo(arg):' +
'\n @param {ee.String} arg The name to which the greeting should be addressed' +
'\n @return {ee.String} The complete greeting.' +
'\n' +
'\n bar:' +
'\n An ee.Date object containing the time at which the object was created.';

exports.foo = function(arg) {
return 'Hello, ' + arg + '! And a good day to you!';
};

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@//
// Harmonic regression
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
exports.harmonicRegression=function(
  independentVars,
  dependentVar,
  imgcol,//must contain "constant" and "t" bands.
  length//length of time range (years)
  ){
    var ind = ee.List(independentVars);//independent variables
    var dependent = ee.String(dependentVar);//dependent variables
    var imgs = imgcol.map(function(image) {
      var timeRadians = image.select('t').multiply(2 * Math.PI);
      return image
        .addBands(timeRadians.cos().rename('cos'))
        .addBands(timeRadians.sin().rename('sin'));
    });
    // harmonic regression
      var harmonicTrend=imgs
        .select(ind.add(dependent))
        .reduce(ee.Reducer.linearRegression(ind.length(), 1))
    // Create new object with harmonic regression coefficients
    var harmonicTrendCoef=harmonicTrend
    .select('coefficients')
    .arrayProject([0])
    .arrayFlatten([ind])
    var amplitude=harmonicTrendCoef//compute amplitude
    .addBands(harmonicTrendCoef.select('cos').hypot(harmonicTrendCoef.select('sin')).multiply(5).rename('amplitude'))
    .select('amplitude')// append amplitude to rangedHTCoeff
    var hifz=imgs.map(function(image){
      return image.set('system:time_start',ee.Date(image.get('system:time_start')))
      
    })
    //------------------------------------------------  
    // compute fitted value  of harmonic regression
    //------------------------------------------------
    var FitAndError=hifz.map(function(subimage) {//for all the IFZ imagery within range 
      // fitted value
      var fit = subimage.select(independentVars)
        .multiply(ee.Image(harmonicTrendCoef))
        .reduce('sum')//summing up all the products of harmonic independents and their coefficients
        //.divide(hifz.size())
        .rename('fit')
      // rmse
      var error=subimage
      .select(dependentVar)
      .subtract(fit)
      .pow(2)
      .divide(hifz.size())
      .sqrt()
      .rename('RMSE')//compute RMSE
      return fit
      .divide(hifz.size())
      .addBands(error)
      .set('system:time_start',subimage.get('system:time_start'))
    })
    var FitAndError=FitAndError.sum()// take mean fitted value and mean square error
      .addBands(harmonicTrendCoef)// append coefficients of harmonic regression
      .addBands(amplitude)// append amplitude
      .set('system:time_start',FitAndError.get('system:time_start'))
return(FitAndError)
}

//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// Harmonic regression for fit
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
exports.harmonicRegressionFit=function(
  independentVars,
  dependentVar,
  imgcol,//must contain "constant" and "t" bands.
  length//length of time range (years)
  ){
    var ind = ee.List(independentVars);//independent variables
    var dependent = ee.String(dependentVar);//dependent variables
    var imgs = imgcol.map(function(image) {
      var timeRadians = image.select('t').multiply(2 * Math.PI);
      return image
        .addBands(timeRadians.cos().rename('cos'))
        .addBands(timeRadians.sin().rename('sin'));
    });
    // harmonic regression
      var harmonicTrend=imgs
        .select(ind.add(dependent))
        .reduce(ee.Reducer.linearRegression(ind.length(), 1))
    // Create new object with harmonic regression coefficients
    var harmonicTrendCoef=harmonicTrend
    .select('coefficients')
    .arrayProject([0])
    .arrayFlatten([ind])
    var amplitude=harmonicTrendCoef//compute amplitude
    .addBands(harmonicTrendCoef.select('cos').hypot(harmonicTrendCoef.select('sin')).multiply(5).rename('amplitude'))
    .select('amplitude')// append amplitude to rangedHTCoeff
    var hifz=imgs.map(function(image){
      return image.set('system:time_start',ee.Date(image.get('system:time_start')))
      
    })
    //------------------------------------------------  
    // compute fitted value  of harmonic regression
    //------------------------------------------------
    var FitAndError=hifz.map(function(subimage) {//for all the IFZ imagery within range 
      // fitted value
      var fit = subimage.select(independentVars)
        .multiply(ee.Image(harmonicTrendCoef))
        .reduce('sum')//summing up all the products of harmonic independents and their coefficients
        //.divide(hifz.size())
        .rename('fit').set('system:time_start',ee.Date(subimage.get('system:time_start')))
      // Compute SE for individual observation. In the main code, Their mean is taken over the time range.
      var error=subimage
        .select(dependentVar)
        .subtract(fit)
        .pow(2)
        // .divide(hifz.size())
        //.sqrt()
        .rename('SE')
      return fit.addBands(subimage.select(dependent)).addBands(error)
        .rename(["HarmonicFit","Observation","SE"])
    })
    return [FitAndError,amplitude,harmonicTrendCoef]
  }





//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
// Data preprocessing
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
exports.landsat=function(
imgcol,
boundary,
imgdatestart,
imgdateend,
cloudpct,
bands,
masknum,
formula,
R,
NIR,
SWIR1,
SWIR2,
alpha,
formula_wdrvi,
//from here for tc
toaRefBands, 
toaMaskband,
imgColTOA,
TCCoefficients,
toaMaskNum1,
toaMaskNum2,
toaMaskNum3,
toaMaskNum4,
Brightness,
Greenness,
Wetness
){
//####################################################
// Image preprocessing for target area
//####################################################
//---------------------------------------------------
//filter Landsat imagery
//---------------------------------------------------
  var lt_interest = imgcol
    .filterBounds(boundary)// Confine scene
    .filterDate(imgdatestart,imgdateend)
    .filterMetadata('CLOUD_COVER','less_than',cloudpct)// Remove cloudful imagery
    .select(bands)//Band selection
//---------------------------------------------------
//mask cloud, shadow of cloud and water 
//---------------------------------------------------
  var masked_interest=lt_interest.map(function(image) {
  var piqa= image.select('pixel_qa');
    return image
    .updateMask(piqa.eq(masknum))
    .set('system:time_start', image.get('system:time_start'))
  })

//#############################################
// compute NDVI
//#############################################
// possibly be used to detecting thinning
var ndvi = masked_interest.map(function(image) {
return image.expression(
formula_wdrvi,{
'R': image.select(R),
'NIR': image.select(NIR),
'alpha': alpha
}).set('system:time_start', image.get('system:time_start')).rename("NDVI")
})
//#############################################
// compute TC 
//#############################################
// preprocess TOA imagery
var Bands=toaRefBands.add(toaMaskband)
var landsattoa=ee.ImageCollection(imgColTOA)
.filterBounds(boundary)
.filterDate(imgdatestart,imgdateend)
.filterMetadata('CLOUD_COVER','less_than',cloudpct)
.select(Bands)

var l5toamasked = landsattoa.map(function(image) {
var cfmask= image.select(toaMaskband);
return image
.updateMask(
cfmask.eq(toaMaskNum1)
.or(cfmask.eq(toaMaskNum2))
.or(cfmask.eq(toaMaskNum3))
.or(cfmask.eq(toaMaskNum4))
)
.rename(Bands);
});

var TC=l5toamasked.select(toaRefBands).map(function(image){
var arrayImage1D = ee.Image(image)
.toArray();
var arrayImage2D = arrayImage1D.toArray(1);
// do a matrix multiplication: 6x6 times 6x1
var componentsImage = ee.Image(TCCoefficients)
.matrixMultiply(arrayImage2D)
.arrayProject([0]) // get rid of the extra dimensions
.arrayFlatten([
['brightness', 'greenness', 'wetness', 'fourth', 'fifth', 'sixth']
]);
return　componentsImage
.set('system:time_start',image.get('system:time_start'))
.set('CLOUD_COVER',image.get('CLOUD_COVER'))
.rename(['brightness', 'greenness', 'wetness', 'fourth', 'fifth', 'sixth'])
})

return([masked_interest,ndvi,TC])
}