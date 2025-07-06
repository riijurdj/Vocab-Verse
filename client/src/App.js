import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Container from 'react-bootstrap/Container';
//import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx'; // Import all exports from xlsx
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Modal from 'react-bootstrap/Modal';

function App() {
  const [rowData, setRowData] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const gridApi = useRef(null);
  const [history, setHistory] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch all words from the API when component mounts
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/words');
      const formattedData = response.data.map((word) => {
        return {
          id: word._id, // Convert ObjectId to string
          word: word.word,
          description: word.description
        };
      });
      setRowData(formattedData);
    } catch (error) {
      console.error('Error fetching words:', error);
    }
  };
  
  const addWord = async () => {
    try {
      let errorMessage = '';
  
      // Validate word
      if (!newWord.trim()) {
        errorMessage += 'Please enter a word.\n';
      }
  
      // Validate description
      if (!newDescription.trim()) {
        errorMessage += 'Please enter a description.\n';
      }
  
      // Check if there are any error messages
      if (errorMessage) {
        alert(errorMessage);
        return;
      }
  
      // If validation passes, make the API call
      await axios.post('http://localhost:3001/api/words', { word: newWord, description: newDescription });
  
      // Fetch updated list of words
      fetchWords();
  
      // Clear input fields
      setNewWord('');
      setNewDescription('');
    } catch (error) {
      console.error('Error adding word:', error);
    }
  };
  
  const handleEditButtonClick = async (data) => {
    const { id, word, description } = data;
    let newWordValue = prompt('Enter the new word:', word);
    let newDescriptionValue = prompt('Enter the new description:', description);
    
    // Validate word
    if (!newWordValue.trim()) {
      alert('Please enter a word.');
      return;
    }
  
    // Validate description
    if (!newDescriptionValue.trim()) {
      alert('Please enter a description.');
      return;
    }
  
    if (newWordValue !== null && newDescriptionValue !== null) {
      try {
        // Store previous state in history
        setHistory([...history, { id, word, description }]);
        await axios.put(`http://localhost:3001/api/words/${id}`, { word: newWordValue, description: newDescriptionValue });
        fetchWords();
      } catch (error) {
        console.error('Error editing word:', error);
      }
    }
  };
  
  const handleDeleteButtonClick = async (data) => {
    const { id, word, description } = data;
    if (window.confirm('Are you sure you want to delete this word?')) {
      try {
        // Store the deleted word in history before deletion
        console.log('Deleting:', { id, word, description });
        setRecycleBin([...recycleBin, { id, word, description }]);
        setHistory([...history, { id, word, description }]);
        await axios.delete(`http://localhost:3001/api/words/${id}`);
        // Remove the deleted word from the rowData state
        setRowData(rowData.filter(item => item.id !== id));
      } catch (error) {
        console.error('Error deleting word:', error);
      }
    }
  };

  const handleShowRecycleBin = async () => {
    try {
        const defaultWordsResponse = await axios.get('http://localhost:3001/api/words/all');
        const defaultWords = defaultWordsResponse.data.map(word => word.word);
        
        const backupWordsResponse = await axios.get('http://localhost:3001/api/backupwords/all');
        const backupWords = backupWordsResponse.data.map(word => ({ id: word._id, word: word.word, description: word.description }));
        
        // Find words in backup database that are not in default database
        const wordsInRecycleBin = backupWords.filter(word => !defaultWords.includes(word.word));

        setRecycleBin(wordsInRecycleBin);
        setShowRecycleBin(true);
    } catch (error) {
        console.error('Error fetching recycle bin:', error);
    }
};

  const handleCloseRecycleBin = () => {
    setShowRecycleBin(false);
  };
  
  const handlePermanentDelete = async (id) => {
    try {
        await axios.delete(`http://localhost:3001/api/backupwords/${id}`);
        setRecycleBin(recycleBin.filter(item => item.id !== id)); 
    } catch (error) {
        console.error('Error deleting word permanently:', error);
    }
};
  
  // const handleUndo = () => {
  //   if (history.length > 0) {
  //     const lastChange = history[history.length - 1];
  //     const { id, word, description } = lastChange;
  //     // Restore the deleted word
  //     console.log('Restoring:', { id, word, description });
  //     axios.post('http://localhost:3001/api/words', { word, description })
  //       .then(() => {
  //         fetchWords();
  //         // Remove the last change from history
  //         setHistory(history.slice(0, -1));
  //         // If the restored word was previously in the recycle bin, remove it from there as well
  //         setRecycleBin(recycleBin.filter(item => item.id !== id));
  //       })
  //       .catch((error) => console.error('Error undoing action:', error));
  //   } else {
  //     alert('No actions to undo.');
  //   }
  // };
  
  const handleRestoreWord = async (id) => {
    try {
      const wordToRestore = recycleBin.find((word) => word.id === id);
  
      // Add the word back to the default database
      await axios.post('http://localhost:3001/api/words', { word: wordToRestore.word, description: wordToRestore.description });
  
      // Remove the restored word from the recycle bin
      setRecycleBin(recycleBin.filter((word) => word.id !== id));
  
      // Fetch updated list of words from the default database
      fetchWords();
  
      // Remove the restored word from the backup database
      await axios.delete(`http://localhost:3001/api/backupwords/${id}`);
    } catch (error) {
      console.error('Error restoring word:', error);
    }
  };
  
  const EditButtonRenderer = (props) => {
    const { data } = props;
    const { _id, word, description } = data;
    return (
      <Button variant="info" onClick={() => handleEditButtonClick({ id: _id, word, description })}>
        Edit
      </Button>
    );
  };
  
  const DeleteButtonRenderer = (props) => {
    const { data } = props;
    const { _id } = data;
    return (
      <Button variant="danger" onClick={() => handleDeleteButtonClick({ id: _id })}>
        Delete
      </Button>
    );
  };  

  const columnDefs = [
  { headerName: 'SrNo', field: 'index', valueGetter: (params) => params.node.rowIndex + 1, width: 100 },
  { headerName: 'Word', field: 'word', width: 200, filter: true },
  { headerName: 'Description', field: 'description', width: 823, filter: true },
  { 
    headerName: 'Edit', 
    colId: 'editButton',
    cellRenderer: (params) => (
      <Button variant="info" onClick={() => handleEditButtonClick(params.data)}>
        Edit
      </Button>
    ),
    width: 150 ,
  },
  { 
    headerName: 'Delete', 
    colId: 'deleteButton',
    cellRenderer: (params) => (
      <Button variant="danger" onClick={() => handleDeleteButtonClick(params.data)}>
        Delete
      </Button>
    ),
    width: 150 ,
  }
];

  const frameworkComponents = {
    editButtonRenderer: EditButtonRenderer,
    deleteButtonRenderer: DeleteButtonRenderer,
  };

  const handleGridReady = (params) => {
    gridApi.current = params.api; // Set gridApi reference when grid is ready
  };

  const handleExportToExcel = () => {
    // Check if gridApi is available
    if (gridApi.current) {
      const rowData = [];
      // Iterate through all grid rows
      gridApi.current.forEachNodeAfterFilterAndSort((rowNode, index) => {
        // Extract data from each row
        rowData.push({
          'SrNo': index + 1,
          'Word': rowNode.data.word,
          'Description': rowNode.data.description
        });
      });
  
      // Define worksheet
      const ws = XLSX.utils.json_to_sheet(rowData);
  
      // Define workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Grid Data');
  
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
      // Save file
      const fileName = 'kapadias_dictionary.xlsx';
      const file = new Blob([excelBuffer], { type: 'application/octet-stream' });
      saveAs(file, fileName);
    } else {
      // If gridApi is not available, show an alert
      alert('Grid not available');
    }
  };

  const handleExportToPDF = () => {
    // Check if gridApi is available
    if (gridApi.current) {
      const rowData = [];
      // Iterate through all grid rows
      gridApi.current.forEachNodeAfterFilterAndSort((rowNode, index) => {
        // Extract data from each row
        rowData.push([
          index + 1,
          rowNode.data.word,
          rowNode.data.description
        ]);
      });
  
      // Define column headers
      const columns = ['SrNo', 'Word', 'Description'];
  
      // Initialize jsPDF
      const doc = new jsPDF();
  
      // Add title
      doc.text('Grid Data', 10, 10);
  
      // Add table
      doc.autoTable({ head: [columns], body: rowData });
  
      // Save PDF
      doc.save('kapdias_dictionary.pdf');
    } else {
      // If gridApi is not available, show an alert
      alert('Grid not available');
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode); // Toggle between dark and light mode
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredRowData = rowData.filter((item) => {
    return item.word.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={darkMode ? "dark-mode" : "light-mode"}>
      <header style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
        <nav>
        <Navbar bg={darkMode ? "dark" : "light"} variant={darkMode ? "dark" : "light"}>
        <Container>
        <div className="d-flex align-items-center">
        <img src='dictionary.png' alt="Dictionary Icon" style={{ width: '30px', marginRight: '10px' }} />
        <Navbar.Brand href="#home">Raj Kapadia</Navbar.Brand>
      </div>
        </Container>
      </Navbar>
  <Form.Check
    type="switch"
    id="custom-switch"
    label={darkMode ? "Light Mode" : "Dark Mode"}
    className="text-right"
    checked={darkMode}
    onChange={toggleTheme}
    style={{ position: 'absolute', top: '17px', right: '10px' }} // Position for desktop
  />
        </nav>
      </header>
        <h1 style={{ textAlign: 'center' }}>Kapadia's Dictionary</h1>
      
      <main style={{ marginTop: '10%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Form style={{ width: '60%' }}>
      <Form.Group className="mb-3" controlId="formBasicEmail">
        <Form.Label style={{ color: darkMode ? '#fff' : '#000' }}>Word</Form.Label>
        <Form.Control
              type="text"
              placeholder="Enter Word"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              style={{ backgroundColor: darkMode ? '#333' : '#fff', color: darkMode ? '#fff' : '#000' }}
            />
        <Form.Text className="text-muted" style={{ color: darkMode ? '#ddd' : '#555' }}>
          Please enter the word.
        </Form.Text>
      </Form.Group>

      <Form.Group className="mb-3" controlId="formBasicPassword">
        <Form.Label style={{ color: darkMode ? '#fff' : '#000' }}>Description</Form.Label>
        <Form.Control
              type="text"
              placeholder="Enter Description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{ backgroundColor: darkMode ? '#333' : '#fff', color: darkMode ? '#fff' : '#000' }}
            />
        <Form.Text className="text-muted" style={{ color: darkMode ? '#ddd' : '#555' }}>
          Please enter the description.
        </Form.Text>
      </Form.Group>
      {/* <Button variant="primary" type="submit" onClick={addWord}>
        Add Word
      </Button>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
      <Button variant="success">Export to Excel</Button>{' '}
      <Button variant="success">Export to PDF</Button>
    </div> */}
    </Form>

    <div className="row" style={{ marginBottom: '50px', width: '60%' }}>
  {/* For desktop view */}
  <div className="d-none d-sm-block col-sm-3">
    <Button variant="warning" type="submit" onClick={addWord} block>
      Add your Word
    </Button>
  </div>
  <div className="d-none d-sm-block col-sm-3">
    <Button variant="success" onClick={handleExportToExcel} block>
      Export to Excel
    </Button>
  </div>
  <div className="d-none d-sm-block col-sm-3">
    <Button variant="success" onClick={handleExportToPDF} block>
      Export to PDF
    </Button>
  </div>
  <div className="d-none d-sm-block col-sm-3">
    <Button variant="warning" onClick={handleShowRecycleBin} block>
      Recycle Bin
    </Button>
  </div>

  {/* For mobile view */}
  <div className="d-sm-none col-6 mb-4">
    <Button variant="warning" type="submit" onClick={addWord} block>
      Add your Word
    </Button>
  </div>
  <div className="d-sm-none col-6 mb-4">
    <Button variant="success" onClick={handleExportToExcel} block>
      Export to Excel
    </Button>
  </div>
  <div className="d-sm-none col-6 mb-4">
    <Button variant="success" onClick={handleExportToPDF} block>
      Export to PDF
    </Button>
  </div>
  <div className="d-sm-none col-6 mb-4">
    <Button variant="warning" onClick={handleShowRecycleBin} block>
      Recycle Bin
    </Button>
  </div>
</div>

    {/* Export Dropdown */}
    {/* <div style={{ marginTop: '10px', textAlign: 'center' }}>
  <Button variant="success" onClick={handleExportToExcel}>Export to Excel</Button>{' '}
  <Button variant="success" onClick={handleExportToPDF}>Export to PDF</Button>
</div>
<div style={{ marginTop: '10px', textAlign: 'center' }}>
  <Button variant="warning" onClick={handleShowRecycleBin}>
    Recycle Bin
  </Button>
</div> */}
    {/* <div className="btn-group" style={{ marginBottom: '10px' }}>
      <Button variant="success">Export</Button>
      <Button variant="success" className="dropdown-toggle dropdown-toggle-split" id="dropdownMenuButton" data-bs-toggle="dropdown" aria-expanded="false">
        <span className="visually-hidden">Toggle Dropdown</span>
      </Button>
      <ul className="dropdown-menu">
        <li><Button className="dropdown-item">Export to Excel</Button></li>
        <li><Button className="dropdown-item">Export to PDF</Button></li>
      </ul>
    </div> */}
    {/* <div className="btn-group" role="group">
    <button id="btnGroupDrop1" type="button" className="btn btn-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
      Dropdown
    </button>
    <ul className="dropdown-menu" aria-labelledby="btnGroupDrop1">
      <li><a className="dropdown-item" href="#">Dropdown link</a></li>
      <li><a className="dropdown-item" href="#">Dropdown link</a></li>
    </ul>
  </div> */}
  {/* <div>
  <Button variant="primary" onClick={handleUndo}>
        Undo
      </Button>
  </div> */}
    <div className={darkMode ? "ag-theme-alpine-dark" : "ag-theme-alpine"} style={{ height: '500px', width: '100%', margin: 'auto' }}>
    <input
  type="text"
  value={searchQuery}
  onChange={handleSearch}
  placeholder="Search..."
  style={{
    marginBottom: '10px',
    width: window.innerWidth > 576 ? '33%' : '50%',
    padding: '5px',
    boxSizing: 'border-box',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: darkMode ? '#333' : '#fff',
    color: darkMode ? '#fff' : '#000',
    border: darkMode ? '1px solid #666' : '1px solid #ccc',
    position: 'relative',
    left: '10px'
  }}
/>
<AgGridReact
      columnDefs={columnDefs}
      rowData={filteredRowData}
      frameworkComponents={frameworkComponents}
      onGridReady={handleGridReady} 
      pagination={true} // Enable pagination
      paginationPageSize={10} // Number of rows per page
      //paginationAutoPageSize = {true}
    />
  </div>
  <Modal show={showRecycleBin} onHide={handleCloseRecycleBin}>
    <Modal.Header closeButton>
      <Modal.Title>Recycle Bin</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      {recycleBin.map((word) => (
    <div key={word.id}>
      <p><strong>Word:</strong> {word.word}</p>
      <p><strong>Description:</strong> {word.description}</p>
      <Button variant="success" onClick={() => handleRestoreWord(word.id)}>Restore</Button>{' '}
      <Button variant="danger" onClick={() => handlePermanentDelete(word.id)}>Delete Permanently</Button>
    </div>
  ))}
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={handleCloseRecycleBin}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
      </main>
      <footer style={{ backgroundColor: darkMode ? '#222' : '#f5f5f5', color: darkMode ? '#fff' : '#000', marginTop: '50px', position: 'sticky', bottom: 0 }}>
  <Navbar bg={darkMode ? "dark" : "light"} variant={darkMode ? "dark" : "light"} style={{height: '40px'}}>
    <Container>
      <Navbar.Text style={{ fontSize: '0.9rem', position: 'absolute', left: '10px'}} className="d-none d-sm-block">Copyright &copy; 2024 Riiju Jagetiya. All Rights Reserved</Navbar.Text>
      <Navbar.Text style={{ fontSize: '0.9rem', position: 'absolute', left: '3px'}} className="d-block d-sm-none">© 2024 Riiju Jagetiya. All Rights Reserved.</Navbar.Text>
      <Navbar.Text style={{ fontSize: '0.9rem', position: 'absolute', right: '6px'}} className="d-none d-sm-block">Version 1.0.0</Navbar.Text>
      <Navbar.Text style={{ fontSize: '0.9rem', position: 'absolute', right: '6px'}} className="d-block d-sm-none">Version 1.0.0</Navbar.Text>
    </Container>
  </Navbar>
</footer>
    </div>
  );
}

export default App;
