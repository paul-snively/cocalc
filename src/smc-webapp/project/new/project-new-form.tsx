import * as misc from "smc-util/misc";

import { React, rtypes, rclass } from "../../app-framework";

import {
  Col,
  Row,
  Button,
  ButtonToolbar,
  FormControl,
  FormGroup,
  Alert
} from "react-bootstrap";

import { ErrorDisplay, Icon, Tip, SettingBox } from "../../r_misc";
import { ProjectActions } from "../../project_actions";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { special_filenames_with_no_extension } = require("../../project_file");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SMC_Dropzone } = require("../../smc-dropzone");
import { PathLink } from "./path-link";
import { NewFileButton } from "./new-file-button";
import { NewFileDropdown } from "./new-file-dropdown";
import { FileTypeSelector } from "./file-type-selector";
import { AvailableFeatures } from "./types";
import { ProjectMap } from "smc-webapp/todo-types";

interface ReactProps {
  project_id: string;
  actions: ProjectActions;
  close?: () => void;
  show_header?: boolean;
  default_filename?: string;
  name: string;
}

interface ReduxProps {
  current_path: string;
  default_filename: string;
  file_creation_error: string;
  available_features: AvailableFeatures;
  project_map: ProjectMap;
  get_total_project_quotas: (project_id: string) => Record<string, any>;
}

interface State {
  filename: string;
  extension_warning: boolean;
  downloading?: boolean;
}

export const ProjectNewForm = rclass(
  class ProjectNewForm extends React.Component<ReactProps & ReduxProps, State> {
    private project_new_filename: React.RefObject<any>;

    static reduxProps({ name }): any {
      return {
        [name]: {
          current_path: rtypes.string,
          default_filename: rtypes.string,
          file_creation_error: rtypes.string,
          available_features: rtypes.immutable
        },
        projects: {
          project_map: rtypes.immutable,
          get_total_project_quotas: rtypes.func
        }
      };
    }

    constructor(props) {
      super(props);
      this.state = {
        filename:
          this.props.default_filename != null
            ? this.props.default_filename
            : this.default_filename(),
        extension_warning: false
      };
      this.project_new_filename = React.createRef();
    }

    static defaultProps = { show_header: true };

    UNSAFE_componentWillReceiveProps(newProps): void {
      if (newProps.default_filename !== this.props.default_filename) {
        this.setState({ filename: newProps.default_filename });
      }
    }

    default_filename(): string {
      return require("../../account").default_filename(
        undefined,
        this.props.project_id
      );
    }

    focus_input(): void {
      this.project_new_filename.current.focus();
    }

    create_file(ext?: string): void {
      if (!this.state.filename) {
        this.focus_input();
        return;
      }
      this.props.actions.create_file({
        name: this.state.filename,
        ext,
        current_path: this.props.current_path
      });
      return typeof this.props.close === "function"
        ? this.props.close()
        : undefined;
    }

    submit(ext?: string): void {
      if (!this.state.filename) {
        // empty filename
        return;
      }
      if (
        ext ||
        special_filenames_with_no_extension().indexOf(this.state.filename) > -1
      ) {
        this.create_file(ext);
      } else if (this.state.filename[this.state.filename.length - 1] === "/") {
        this.create_folder();
      } else if (
        misc.filename_extension(this.state.filename) ||
        misc.is_only_downloadable(this.state.filename)
      ) {
        this.create_file();
      } else {
        this.setState({ extension_warning: true });
      }
    }

    submit_via_enter(e): void {
      e.preventDefault();
      this.submit();
    }

    close_button(): JSX.Element | undefined {
      if (!this.props.close) {
        return;
      }
      return (
        <Button
          onClick={(): void => {
            this.props.close?.();
          }}
          className={"pull-right"}
        >
          Close
        </Button>
      );
    }

    render_error(): JSX.Element {
      let message;
      const error = this.props.file_creation_error;
      if (error === "not running") {
        message = "The project is not running. Please try again in a moment";
      } else {
        message = error;
      }
      return (
        <ErrorDisplay
          error={message}
          onClose={(): void => {
            this.props.actions.setState({ file_creation_error: "" });
          }}
        />
      );
    }

    blocked(): string {
      if (this.props.project_map == null) {
        return "";
      }
      if (this.props.get_total_project_quotas(this.props.project_id)?.network) {
        return "";
      } else {
        return " (access blocked -- see project settings)";
      }
    }

    create_folder(): void {
      this.props.actions.create_folder({
        name: this.state.filename,
        current_path: this.props.current_path,
        switch_over: true
      });
      this.props.close?.();
    }

    render_no_extension_alert(): JSX.Element {
      return (
        <Alert
          bsStyle="warning"
          style={{ marginTop: "10px", fontWeight: "bold" }}
        >
          <p>
            Warning: Are you sure you want to create a file with no extension?
            This will use a plain text editor. If you do not want this, click a
            button below to create the corresponding type of file.
          </p>
          <ButtonToolbar style={{ marginTop: "10px" }}>
            <Button
              onClick={(): void => {
                this.create_file();
              }}
              bsStyle="success"
            >
              Yes, please create this file with no extension
            </Button>
            <Button
              onClick={(): void => {
                this.setState({ extension_warning: false });
              }}
              bsStyle="default"
            >
              Cancel
            </Button>
          </ButtonToolbar>
        </Alert>
      );
    }

    render_close_row(): JSX.Element | undefined {
      if (!this.props.close) {
        return;
      }
      return (
        <Row>
          <Col sm={9}>
            <div style={{ color: "#666" }}>
              <em>
                Read about{" "}
                <a
                  href="https://doc.cocalc.com/howto/upload.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  other ways to upload files.
                </a>{" "}
                You can also drag & drop files on the file listing.
              </em>
            </div>
          </Col>
          <Col sm={3}>
            <Row>
              <Col sm={12}>{this.close_button()}</Col>
            </Row>
          </Col>
        </Row>
      );
    }

    render_upload(): JSX.Element {
      return (
        <>
          <Row style={{ marginTop: "20px" }}>
            <Col sm={12}>
              <h4>
                <Icon name="cloud-upload" /> Upload
              </h4>
            </Col>
          </Row>
          <Row>
            <Col sm={12}>
              <SMC_Dropzone
                dropzone_handler={{
                  complete: (): void => {
                    this.props.actions.fetch_directory_listing();
                  }
                }}
                project_id={this.props.project_id}
                current_path={this.props.current_path}
                show_header={false}
              />
            </Col>
          </Row>
          {this.render_close_row()}
        </>
      );
    }

    render_new_file_folder(): JSX.Element {
      return (
        <>
          <Tip
            title={"Folder"}
            placement={"left"}
            icon={"folder-open-o"}
            tip={
              "Create a folder (sub-directory) in which to store and organize your files.  CoCalc provides a full featured filesystem."
            }
          >
            <NewFileButton
              icon={"folder-open-o"}
              name={"Folder"}
              on_click={this.create_folder}
              className={"pull-right"}
            />
          </Tip>
          <Tip
            icon="file"
            title="Any Type of File"
            tip="Create a wide range of files, including HTML, Markdown, C/C++ and Java programs, etc."
            placement="top"
          >
            <NewFileDropdown create_file={this.submit} />
          </Tip>
        </>
      );
    }

    render_filename_form(): JSX.Element {
      const onChange = (): void => {
        if (this.state.extension_warning) {
          this.setState({ extension_warning: false });
        } else {
          this.setState({
            filename: this.project_new_filename.current.value
          });
        }
      };

      const onKey = (e: React.KeyboardEvent<FormControl>): void => {
        if (e.keyCode === 27) {
          this.props.close?.();
        }
      };

      return (
        <form onSubmit={this.submit_via_enter}>
          <FormGroup>
            <FormControl
              autoFocus
              ref={this.project_new_filename}
              value={this.state.filename}
              type={"text"}
              disabled={this.state.extension_warning}
              placeholder={
                "Name your file, folder, or a URL to download from..."
              }
              onChange={onChange}
              onKeyDown={onKey}
            />
          </FormGroup>
        </form>
      );
    }

    render_title(): JSX.Element | undefined {
      if (this.props.current_path != null) {
        return (
          <span>
            Create new files in{" "}
            <PathLink
              path={this.props.current_path}
              actions={this.props.actions}
            />
          </span>
        );
      }
    }

    render(): JSX.Element {
      //key is so autofocus works below
      return (
        <SettingBox
          show_header={this.props.show_header}
          icon={"plus-circle"}
          title_el={this.render_title()}
          close={this.props.close}
        >
          <Row key={this.props.default_filename}>
            <Col sm={12}>
              <div style={{ color: "#666", paddingBottom: "5px" }}>
                Name your file, folder or paste in a link
              </div>
              <div
                style={{
                  display: "flex",
                  flexFlow: "row wrap",
                  justifyContent: "space-between",
                  alignItems: "stretch"
                }}
              >
                <div
                  style={{
                    flex: "1 0 auto",
                    marginRight: "10px",
                    minWidth: "20em"
                  }}
                >
                  {this.render_filename_form()}
                </div>
                <div style={{ flex: "0 0 auto" }}>
                  {this.render_new_file_folder()}
                </div>
              </div>
              {this.state.extension_warning
                ? this.render_no_extension_alert()
                : undefined}
              {this.props.file_creation_error ? this.render_error() : undefined}
              <div style={{ color: "#666", paddingBottom: "5px" }}>
                Select the type of file
              </div>
              <FileTypeSelector
                name={this.props.name}
                create_file={this.submit}
                create_folder={this.create_folder}
                project_id={this.props.project_id}
              >
                <Tip
                  title={"Download files from the Internet"}
                  icon={"cloud"}
                  placement={"bottom"}
                  tip={`Paste a URL into the box above, then click here to download a file from the internet. ${this.blocked()}`}
                >
                  <NewFileButton
                    icon={"cloud"}
                    name={`Download from Internet ${this.blocked()}`}
                    on_click={this.create_file}
                    loading={this.state.downloading}
                  />
                </Tip>
              </FileTypeSelector>
            </Col>
          </Row>
          {this.render_upload()}
        </SettingBox>
      );
    }
  }
);
