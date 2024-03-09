// START: SignUp Listener
async function SignUp(e){
    e.preventDefault();
    
  try{
    const details={
        name: e.target.name.value,
        email: e.target.email.value,
        password: e.target.password.value
    }
    let response= await axios.post("http://localhost:3500/user/signup", details);
    if(response.status === 200)     
    {
      alert("User Successfully Created!");
      window.location.href= "../Login/login.html"; // Change the page on successful account creation
    }
  }
  catch(err)
  {
    console.log(err)
    if(err.response.status== 404)
    {
        alert('User already exist');
    }
    else if(err.response.status== 400) { 
      alert('Please Fill All The Entries!');
    }
    // return document.body.innerHTML+= `<div style = "color:red;"> ${err}</div>`;
  }
}
//END: SignUp Listener
