var ProductNameInput=document.getElementById('productName');
var ProductPriceInput=document.getElementById('productPrice');
var ProductCategoryInput=document.getElementById('productCategory');
var ProductDescInput=document.getElementById('productDesc');

productContainer = [];
var currentIndex =-1;

if (localStorage.getItem('ourProducts')!=null){
    productContainer = JSON.parse(localStorage.getItem('ourProducts'));
    displayProdects();
}


function addProduct() {
    var product = {
            name:ProductNameInput.value,
            price:ProductPriceInput.value,
            category:ProductCategoryInput.value,
            description:ProductDescInput.value
        }


    if (document.getElementById("mainBtn").innerHTML == "update product"){
        productContainer[currentIndex] = product;
        document.getElementById("mainBtn").innerHTML = "Add Product";
    }
    else{
        productContainer.push(product);
    }

    displayProdects();
    localStorage.setItem('ourProducts', JSON.stringify (productContainer));
    clear();
}

function clear() {
    
    ProductNameInput.value = "";
    ProductPriceInput.value = "";
    ProductCategoryInput.value = "";
    ProductDescInput.value = ""; 
}

function displayProdects() {
    var cartoona = ``;
    for (var i=0; i < productContainer.length; i++){
      cartoona += `<tr>
      <td>${i}</td>
      <td>${productContainer[i].name}</td>
      <td>${productContainer[i].price}</td>
      <td>${productContainer[i].category}</td>
      <td>${productContainer[i].description}</td>
      <td><button onclick='updateProduct(${i})' class="btn btn-outline-warning">update</button></td>
      <td><button onclick='deleteProduct(${i})' class="btn btn-outline-danger">delete</button></td>
      </tr>`;
    }
    document.getElementById("tableBody").innerHTML = cartoona;
}

function deleteProduct(index) {
    productContainer.splice(index,1);
    localStorage.setItem('ourProducts', JSON.stringify (productContainer) );
    displayProdects();
}

function searchProduct(term) {
    var cartoona = "";
    for( var i =0; i < productContainer.length; i++){
      if(productContainer[i].name.toLowerCase().includes(term.toLowerCase()) == true) {
      cartoona += `<tr>
      <td>${i}</td>
      <td>${productContainer[i].name}</td>
      <td>${productContainer[i].price}</td>
      <td>${productContainer[i].category}</td>
      <td>${productContainer[i].description}</td>
      <td><button onclick='updateProduct(${i})' class="btn btn-outline-warning">update</button></td>
      <td><button onclick="deleteProduct(${i})" class="btn btn-outline-danger">delete</button></td>
      </tr>`;
      }
    }
    document.getElementById('tableBody').innerHTML = cartoona;
}

function updateProduct(index) {
    ProductNameInput.value=productContainer[index].name;
    ProductPriceInput.value=productContainer[index].price;
    ProductCategoryInput.value=productContainer[index].category;
    ProductDescInput.value=productContainer[index].description;

    document.getElementById('mainBtn').innerHTML = 'update product';
    currentIndex = index
}


