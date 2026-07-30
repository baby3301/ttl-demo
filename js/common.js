$(document).ready(function () {
 //   $('[data-fancybox]').fancybox({
	// 	hash: false,
	// 	image: {
	// 		preload: true // Preload images for a smoother experience
	// 	}
	// });

   document.addEventListener('contextmenu', function(event) {
      // event.preventDefault();
   });
});

function exportImage() {
   if (onRun) return;
   if (onExport) return;

   const inputValue = document.getElementById("search").value || "primaby";
   const element = document.body;
   if (!element) return;

   const onExportSuccess = (dataUrl) => {
      var link = document.createElement('a');
      link.download = `${inputValue}_ttl_${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
   };

   const onExportError = (error) => {
      console.error('error when exportImage:', error);
      alertTemplate(true, 'Thông Báo', 'Không thể xuất ảnh, vui lòng thử lại hoặc liên hệ admin!');
   };

   toggleLoadingMenu(true);

   let filterEl = function (node) {
      if (node.id === 'actions') return false;
      return true;
   };
   const configToJpg = {
      filter: filterEl,
      cacheBust: false,
   };

   if (isIOSorSafari()) {
      console.log('isIOSorSafari: render 2 time');

      document.getElementById('ground-highlight-container').classList.add('ios-export-mode');
      document.getElementById('dot-3d').classList.add('ios-export-mode');

      htmlToImage.toJpeg(element, configToJpg)
         .then(() => new Promise(resolve => setTimeout(resolve, 100))) // timeout 100ms
         .then(() => htmlToImage.toJpeg(element, configToJpg))
         .then(onExportSuccess)
         .catch(onExportError)
         .finally(function () {
            document.getElementById('ground-highlight-container').classList.remove('ios-export-mode');
            document.getElementById('dot-3d').classList.remove('ios-export-mode');
            toggleLoadingMenu(false);
         });
         
   } else {
      htmlToImage.toJpeg(element, configToJpg)
         .then(onExportSuccess)
         .catch(onExportError)
         .finally(function () { toggleLoadingMenu(false) });
   }
}

function exportHtmlToImg() {
   if (onRun) return;
   if (onExport) return;

   const inputValue = document.getElementById("search").value || "chican";
   const element = document.body;
   if (!element) return;

   toggleLoading(true);

   let filterEl = function (node) {
      if (node.id === 'actions') return false;
      return true;
   };

   //toPng, toJpeg
   htmlToImage.toJpeg(element, {
         filter: filterEl,
         cacheBust: true,
         // quality: 0.8,
         // pixelRatio: 1,
         // backgroundColor: '#254f4d',
      }).then(function (dataUrl) {
         var link = document.createElement('a');
         link.download = `${inputValue}_ttl_${Date.now()}.jpg`;
         link.href = dataUrl;
         link.click();
      }).catch(function (error) {
         console.error('Đã xảy ra lỗi khi xuất ảnh: ', error);
         alertTemplate(true, 'Thông Báo', 'Không thể xuất ảnh, vui lòng thử lại hoặc liên hệ admin!');
      }).finally(function () {
         toggleLoading(false);
      });
}

async function searchCode() {
   onRun = true;
   toggleLoading(true);
   const minimumDelay = new Promise(resolve => setTimeout(resolve, 500));
   const searchValue = document.getElementById("search").value;

   try {
      const [config] = await Promise.all([
         getConfigByCode(searchValue),
         minimumDelay
      ]);
      // let config = getConfigByCode(searchValue);
      // console.log(config)
      if (!config) {
         onRun = false;
         toggleLoading(false)
         alertTemplate(true, 'Thông Báo', 'Không tìm thấy mã căn: ' + searchValue);
         // document.getElementById("search").value = "";
         document.getElementById("search").style.borderColor = "red";
         document.getElementById("previews").classList.remove('focus')
         return;
      }
      handleResult(searchValue, config);
   } catch (error) {
      await minimumDelay; 
   } finally {
      onRun = false;
      toggleLoading(false);
   }

}

const arrSource3d = {
   "1": "images/view-front.jpg",
   "2": "images/view-behind.jpg",
   "3": "images/view-side.jpg",
};

function handleResult(codeSearch, configData) {
   document.getElementById("previews").classList.add('focus')
   //overview
   document.getElementById("code").innerHTML = codeSearch;
   document.getElementById("floor").innerHTML = parseInt(configData.realFloor);
   document.getElementById("type").innerHTML = configData.type;
   document.getElementById("area").innerHTML = configData.area +' M<sup>2</sup>';
   document.getElementById("view").innerHTML = configData.viewLabel;
   // document.getElementById("direction-label").innerHTML = configData.directionLabel;

   //ground
   document.getElementById("container-ground-view").className = "ground-image-container " + codeSearch;
   let sourceGround = "images/ground-default.jpg";
   if (configData.floor == 5) {
      sourceGround = "images/ground-floor5.jpg";
   }
   document.getElementById("ground-img").src = sourceGround;
   setHighlightInGround(configData)

   //3d
   let source3d = "images/view-front.jpg";
   if (typeof arrSource3d[configData.position] !== 'undefined') {
      source3d = arrSource3d[configData.position];
   }
   document.getElementById("bg-3d-view").style.backgroundImage = "url('"+source3d+"')";
   document.getElementById("container-3d-view").className = "card card-3d " + codeSearch;
   let resDot = renderDot(configData.coordinates);

   //direction view
   let urlDirection = "images/direction-view/" + configData.direction;
   document.getElementById("bg-direction-view").style.backgroundImage = "url('"+urlDirection+"')";
   //vision view
   let urlVision = "images/vision-view/" + configData.view;
   document.getElementById("bg-vision-view").style.backgroundImage = "url('"+urlVision+"')";

   toggleLoading(false);
}

function setDefaultView()
{
   document.getElementById("previews").className = "previews";
   document.getElementById("container-ground-view").className = "ground-image-container";
   document.getElementById("container-3d-view").className = "card card-3d";
}

function getConfigByCode(code) {
   setDefaultView();
   setHighlightInGround(null);
   
   const [firstChar, secondChar, thirdChar] = code.split("-");
   const floor = checkFloor(secondChar);
   if (!floor) {
      return null;
   }

   if(!apartmentData) {
      return null;
   }

   let result = apartmentData[firstChar]?.[floor]?.[thirdChar] ?? null;
   if (!result) {
      return null
   }

   let cdns = coordinatesDot[firstChar]?.[secondChar]?.[thirdChar] ?? null;
   result.classCode = `${firstChar}${thirdChar}`;
   result.realFloor = secondChar;
	result.searchCode = code;
   result.coordinates = cdns;
   return result;
} 

function checkFloor(str) {
   if (str === "05" || str === "06") {
      return str;
   }
   
   const num = parseInt(str, 10);
   if (num >= 7 && num <= 30) {
      return "06";
   }
   
   return null; 
}

function setHighlightInGround(configData)
{
   const elementGround = document.getElementById("ground-highlight-container");
   if (!configData || !configData.floor || !configData.code) {
      elementGround.className = "highlight-room-container";
      return;
   }

   let classCode = configData.code;
   if (configData.floor > 5) {
      classCode = configData.classCode;
   }

   document.querySelector('#ground-highlight-container .label-highlight').textContent = configData.searchCode;
   elementGround.className = "highlight-room-container " + classCode;
}

function renderDot(coordinates) {
   if (!coordinates) {
      return;
   }

   let dot3D = document.getElementById("dot-3d")
   if (coordinates.x && coordinates.y) {
      dot3D.style.left = `${coordinates.x}%`;
      dot3D.style.top = `${coordinates.y}%`;
   }
   // dot3D.style.display = 'block';
   return;
}

function toggleLoading(show){
   const blockLoading = document.getElementsByClassName('loading-container')
   if (show) {
      Array.from(blockLoading).forEach(element => {
         element.style.display = 'block';
      });
   } else {
      Array.from(blockLoading).forEach(element => {
         element.style.display = 'none';
      });
   }
}

function toggleLoadingMenu(show) {
   const loadingMenu = document.getElementById('loading-menu')
   if (show) {
      loadingMenu.style.display = 'block';
   } else {
      loadingMenu.style.display = 'none';
   }
}

function alertTemplate(success = true, title, msg) {
   if (success) {
      $.confirm({
         title: title,
         content: msg,
         type: 'red',
         typeAnimated: true,
         closeIcon: true,
         buttons: {
            ok: {
               text: 'OK',
               action: function () {}
            }
         }
      });
   } else {
      $.confirm({
         title: title,
         content: msg,
         type: 'green',
         typeAnimated: true,
         closeIcon: true,
         buttons: {
            ok: {
               text: 'OK',
               action: function () {}
            }
         }
      });
   }
}


function isSafariBrowser() {
   const ua = navigator.userAgent.toLowerCase();
   const vendor = navigator.vendor;
   
   // Trình duyệt của Apple thường có vendor chứa chữ "Apple"
   const isApple = vendor && vendor.includes('Apple');
   // Loại trừ Chrome (CriOS) và Firefox (FxiOS) trên iOS
   const isNotChromeOrFirefox = !ua.includes('crios') && !ua.includes('fxios');

   return isApple && isNotChromeOrFirefox;
}

function isIOSorSafari() {
   const ua = navigator.userAgent.toLowerCase();
   
   // 1. Kiểm tra xem có phải thiết bị iOS không (iPhone, iPad, iPod)
   // Lưu ý: iPadOS mới dùng chung userAgent với Mac, nên cần check thêm maxTouchPoints
   const isIOS = /iphone|ipad|ipod/.test(ua) || 
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
   // 2. Kiểm tra Safari trên Mac
   const isMacSafari = navigator.vendor && navigator.vendor.includes('Apple') && 
                     !ua.includes('crios') && !ua.includes('fxios');           
   return isIOS || isMacSafari;
}