-- Create tags table
CREATE TABLE tags (
    name VARCHAR(255) NOT NULL PRIMARY KEY,
    type VARCHAR(100) NOT NULL
);

-- Create many-to-many relation table between data_files and tags
CREATE TABLE datafile_tags (
    data_file_c_id VARCHAR(255) NOT NULL,
    tag_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (data_file_c_id, tag_name),
    FOREIGN KEY (data_file_c_id) REFERENCES data_files(cid),
    FOREIGN KEY (tag_name) REFERENCES tags(name)
);
