var duplicateZeros = function (arr) {
  let nextEle = arr[0];
let i =0;
let j = i+1;
  while(i < arr.length-2) {
    if (arr[i] === 0) {
      console.log(arr[i],"if 0")
      let temp = arr[i+1];
      console.log(temp,"if 1")
      arr[i+1] = 0;
      nextEle = arr[i+2];
      arr[i+2] = temp;

     i+=2;
    } else {
      let nTemp = arr[i];
      arr[i] = nextEle;
      nextEle = nTemp;
      console.log(i, "Value of i in else")
      i++;
    }
  }
  console.log(nextEle)
  return arr;
};


console.log(duplicateZeros([1,0,2,3,0,6]));