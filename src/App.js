import "./App.css";

import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { pdfjs } from 'react-pdf';
import LanguageLinter from "new-relic-language-linter";
import styled from "styled-components";
import { Grammarly, GrammarlyEditorPlugin } from "@grammarly/editor-sdk-react";

// css button
const Button = styled.button`
  background-color: black;
  color: white;
  font-size: 20px;
  padding: 10px 60px;
  border-radius: 5px;
  margin: 10px 5px;
  cursor: pointer;
`;

// css input
const StyledInput = styled.input`
  background-color: #ddd;
  display: block;
  margin: 20px 0px;
  border: 1px solid lightblue;
`;

let alltext = [];
const MAX_LENGTH = 128;

function App() {
  const [file, setFile] = useState(null);
  const [sampleText, setSampleText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPage, setTotalPage] = useState(1);

  
  let pdfUrl = '';

  const handleFileChange = (e) => {
    let fileUp = e.target.files[0];
    console.log(fileUp);

    // kiểm tra có file hay không
    if (!fileUp) {
      e.target.value = "";
      return;
    };

    // check loại file tải lên
    if (!/[pdf|txt|doc|docx]/i.test(fileUp.type)) {
      alert('Chỉ được phép upload file PDF!!!');
      e.target.value = "";
      return;
    }
    if (fileUp.size > 2 * 1024 * 1024) {
      alert(`Kích thước file upload: ${fileUp[0].size} byte, vượt quá dung lượng cho phép: 2 MB.`);
      e.target.value = "";
      return;
    }

    setFile(fileUp);
  };

  const handleConvert = () => {
    // Set the worker source for PDF.js library
    if (!file) {
      alert("Vui lòng chọn file....");
      return;
    }
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
    let fr = new FileReader();
    console.log(file);
    if (file.type !== "application/pdf") {
      fr.readAsText(file);
      fr.onload = () => {
        let text = fr.result;
        if(text.length >= MAX_LENGTH){
            let dataSplit = splitTextPreservingWords(text, MAX_LENGTH);
            alltext.concat(dataSplit);
        }
        else {
          alltext.push(text);
        }
        // setSampleText(alltext[0]);
        // let textData = splitTextPreservingWords(text, MAX_LENGTH);
        // alltext = [...alltext, ...textData];
      }
      setTotalPage(alltext.length);
      return;
    }

    // handle file .pdf
    fr.readAsDataURL(file);

    fr.onload = () => {
      pdfUrl = fr.result;
      extractText(pdfUrl);
    }
  }

  const splitTextPreservingWords = (text, maxLength) =>  {
    // Tách văn bản thành các từ
    const words = text.split(' ');

    // Khởi tạo danh sách chứa các đoạn văn bản
    const chunks = [];
    let currentChunk = '';

    // Duyệt qua từng từ và thêm vào đoạn văn bản hiện tại
    for (const word of words) {
      if (currentChunk.length + word.length + 1 <= maxLength) {
        currentChunk += word + ' ';
      } else {
        // Khi đoạn văn bản vượt quá độ dài tối đa, thêm vào danh sách và bắt đầu lại từ từ mới
        chunks.push(currentChunk.trim());
        currentChunk = word + ' ';
      }
    }

    // Thêm đoạn cuối cùng vào danh sách
    chunks.push(currentChunk.trim());

    return chunks;
  }

  const extractText = async (url) => {
    try {
      let pdf;
      pdf = await pdfjs.getDocument(url).promise; // Get the PDF document

      let pages = await pdf.numPages; // Get the total number of pages in the PDF


      for (let i = 1; i <= pages; i++) {
        let page = await pdf.getPage(i); // Get the page object for each page
        let txt = await page.getTextContent(); // Get the text content of the page

        let text = txt.items.map((s) => s.str).join(""); // Concatenate the text items into a single string
        let textData = splitTextPreservingWords(text, MAX_LENGTH);

        alltext = alltext.concat(textData); // Add the extracted text to the array
      }

      console.log(alltext);
      alert('Convert thành công...');
      setTotalPage(alltext.length);
      setSampleText(alltext[0]);
    }
    catch (err) {
      alert(`Lỗi chuyển đổi: ${err.message}`);
    };
  }

  const handleShow = () => {
    setSampleText(alltext[1]);
  }


  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      console.log(currentPage, totalPage);
      setSampleText(alltext[currentPage - 1]); // Lưu ý sửa đổi ở đây
      // window.location.reload();
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPage) {
      setCurrentPage(currentPage + 1);

      console.log(sampleText);

      setSampleText(alltext[currentPage - 1]); // Lưu ý sửa đổi ở đây
      // window.location.reload();
    }
  }

  const handleTextAreaOnChange = (value) => {
    setSampleText(value);
  };

  return (
    <div className="app-container">
      <div className="primary-section">
        <header>
          <h1 className="page-title">Upload file PDF và sửa lỗi chính tả, ngữ pháp</h1>
          <p>
            Like Grammarly focused on writing-style
            and grammar.
          </p>
        </header>
        <div>
          <StyledInput type="file" onChange={handleFileChange} tabIndex={1}/>
          <Button onClick={handleConvert}>Convert To Text</Button>
          <Button onClick={handleShow}>Show Text</Button>
        </div>

        <div>
          <p>Current Page: {currentPage} of Total {totalPage}</p>
          <Button key={file} onClick={goToPrevPage} disabled={currentPage === 1}>
            Previous Page
          </Button>

          <Button onClick={goToNextPage} disabled={currentPage  === alltext.length}>
            Next Page
          </Button>
        </div>

        <div className="primary-section-body">
          <form className="form-container">
            <label> Kiểm tra chính tả bằng Language Linter </label>
            <CodeMirror
              // key={currentPage}
              value={sampleText}
              onChange={(value) => handleTextAreaOnChange(value)}
              height="300px"
              width="100%"
              extensions={[EditorView.lineWrapping]}
              basicSetup={false}
              autoFocus={true}
              placeholder="Write or paste your text here... (không quá 1024 kí tự)"
            />
          </form>
          <hr className="standard-hr" />
        </div>

        <div className="primary-section-body">
          <Grammarly clientId="client_9m1fYK3MPQxwKsib5CxtpB">
            <label>Check by Grammarly Plugin</label>
            <GrammarlyEditorPlugin>
              <textarea 
              // key={currentPage}
              value={sampleText}
              style={{ width: "100%", height: "300px" }}
              placeholder="Văn bản hiển thị tại đây..."
              onChange={handleTextAreaOnChange}
              ></textarea>
            </GrammarlyEditorPlugin>
          </Grammarly>
        </div>

      </div>
      <div className="suggestions-container">
        <h2>Suggestions</h2>
        <LanguageLinter sampleText={sampleText} setSampleText={setSampleText} />
      </div>
    </div>
  );
}


export default App;
