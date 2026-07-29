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

   const inputValue = document.getElementById("search").value;
   const element = document.body;
   // const element = document.getElementById('page-wrapper');
   // const element = document.getElementById('card-ground');
   if (!element) return;

   html2canvas(element, { 
      useCORS: true,
      allowTaint: false,
      onclone: function(clonedDoc) {
         const textElement = clonedDoc.getElementById('code'); 
         if (textElement) {
            //text background not working => remove
            textElement.style.background = 'none'; 
            textElement.style.webkitBackgroundClip = 'initial';
            textElement.style.backgroundClip = 'initial';
            //add color default
            textElement.style.webkitTextFillColor = 'initial';
            textElement.style.color = '#f3d998'; 
         }
      }
   }).then(function(canvas) {
      const imageURL = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.href = imageURL;
      link.download = `${inputValue}-${Date.now()}.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   });

}

function exportDomToImg() {
   const inputValue = document.getElementById("search").value || "screenshot";
   const element = document.body; // Hoặc id của container chứa bản đồ
   if (!element) return;

   const actionElement = document.getElementById('actions');
   if (actionElement) {
      actionElement.style.opacity = 0;
   }

   domtoimage.toPng(element, {
      // filter: (node) => node.id !== 'actions'
      width: element.clientWidth * 2, // Tăng độ nét (scale 2x)
      height: element.clientHeight * 2,
      style: {
         transform: 'scale(2)',
         transformOrigin: 'top left'
      }
   }).then(function (dataUrl) {
      const link = document.createElement('a');
      link.download = `${inputValue}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
   }).catch(function (error) {
      console.error('Lỗi khi tạo ảnh:', error);
   }).finally(function () {
      if (actionElement) {
         actionElement.style.opacity = 1; 
      }
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
