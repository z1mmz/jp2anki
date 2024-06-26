import { useState,useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Box, Stack, Input,Textarea,SimpleGrid, Flex, Button, Heading} from "@chakra-ui/react"

function App() {
  const [count, setCount] = useState(0)
  const [text, setText] = useState("")
  const [title,setTitle] = useState("")
  const [file,setFile] = useState(null)
  const [fileName,setFileName] = useState(null)
  const [taskId, setTaskId] = useState("")
  const [Result, setResult] = useState("")
  const [Loading, setLoading] = useState(false)
  

  const update_file = (Result) =>{
    console.log(Result);
    setFileName(Result.title);
    // console.log(Result.data);
    const byteCharacters = atob(Result.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/octet-stream' }); // Adjust type as per your file type
    setFile(URL.createObjectURL(blob))

  };

  const submit_handler = () =>{
    setFile(null)
    console.log(text)
    fetch('http://127.0.0.1:5000/ankify', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: title,
      text: text,
    })
    }).then(res => res.json()).then(json => setTaskId(json["result_id"])); //returns array of data
    //  .then(data => update_file(data)); //assign state to array res
  };


  const pollTask = async (id) => {

    try {
        const response = await fetch(`http://127.0.0.1:5000/result/${id}`);
        const data = await response.json();
        // console.log(data)
        setLoading(true);
        if (data.ready != true) {
            setTimeout(() => pollTask(id), 2000);  // Poll every 2 seconds
        } else {
            // console.log(data)
            setLoading(false);
            setResult(data.value);
            console.log(data.value);
            update_file(data.value);
            
            
        }
    } catch (error) {
        console.error("Error polling task:", error);
        setLoading(false);
    }
};

useEffect(() => {
    if (taskId) {
        pollTask(taskId);
    }
}, [taskId]);

  function dl_link(){
    if (file == null){
      return ""
    }else{
      return <a href={file} download="a.apkg"></a>
    }

  }
  return (
    <div>   
  
      <Box zIndex={1} m={"10%"} > 
      <SimpleGrid columns={{sm:1,md:2}} spacing={10}>
      <Box>
        <Stack width={"100%"}>
          <Heading fontWeight={800} fontSize={{md:32}}>Japanese to Anki</Heading>

              <Input width={{sm:"100%",md:"60%"}} onChange={e => setTitle(e.target.value)}></Input>
              <Textarea onChange={e => setText(e.target.value)} rows="5" cols="50"></Textarea>
              <Box justifyContent={"right"} display={"flex"}>
              <Button width={{sm:"100%",md:"60%"}} onClick={submit_handler} >Create Anki deck</Button>
              </Box>
            
          </Stack>
        </Box>
        {Loading && <Box><p>Creating anki deck...</p></Box>}
        {file && <Box ><Button><a href={file}　download={fileName}>Download: {fileName}</a></Button></Box>}
     
        </SimpleGrid>
      </Box>
      </div>
  )
}

export default App
