import { useState } from 'react'
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


  function update_file(res){
    console.log(res);
    setFileName(res.headers.get("Content-Disposition").split('filename=')[1]);
    // res..then(data => console.log(data));
    // setFileName(res.headers.get('Content-Disposition').split('filename=')[1]);
    res.blob().then(data => setFile(URL.createObjectURL(data)));
    

  };

  function submit_handler (){
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
  function dl_link(){
    if (file == null){
      return ""
    }else{
      return <a href={file} download="a.apkg"></a>
    }

  }
  return (
    <div>
      {/* <Box zIndex={0} borderRadius='100%' bg='tomato' color='white' pt={100} w={"50%"} h={"50%"}>

    </Box> */}
            
  
      <Box zIndex={1} m={"15%"} > 
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
        {file && <Box><Button><a href={file}　download={fileName}>Download: {fileName}</a></Button></Box>}
     
        </SimpleGrid>
      </Box>
      </div>
  )
}

export default App
