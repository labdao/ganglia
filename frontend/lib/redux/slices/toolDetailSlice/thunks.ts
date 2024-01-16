import { createAppAsyncThunk } from "@/lib/redux/createAppAsyncThunk";

import { getTool, patchTool } from "./asyncActions";
import { setToolDetail, setToolDetailError, setToolDetailLoading, setToolDetailSuccess } from "./slice";

export const toolDetailThunk = createAppAsyncThunk("tool/toolDetail", async (bacalhauToolID: string, { dispatch }) => {
  dispatch(setToolDetailLoading(true));
  try {
    const responseData = await getTool(bacalhauToolID);
    dispatch(setToolDetailSuccess(true));
    dispatch(setToolDetail(responseData));
    dispatch(setToolDetailLoading(false));
    return responseData;
  } catch (error: unknown) {
    console.log("Failed to get Tool.", error);
    if (error instanceof Error) {
      dispatch(setToolDetailError(error.message));
    } else {
      dispatch(setToolDetailError("Failed to get Tool."));
    }
    dispatch(setToolDetailLoading(false));
    return false;
  }
});

export const toolPatchDetailThunk = createAppAsyncThunk("tool/toolPatchDetail", async (bacalhauToolID: string, { dispatch }) => {
  dispatch(setToolDetailLoading(true));
  try {
    const responseData = await patchTool(bacalhauToolID);
    dispatch(setToolDetailLoading(false));
    dispatch(setToolDetailSuccess(true));
    dispatch(setToolDetail(responseData));
    return responseData;
  } catch (error: unknown) {
    console.log("Failed to get Tool.", error);
    if (error instanceof Error) {
      dispatch(setToolDetailError(error.message));
    } else {
      dispatch(setToolDetailError("Failed to patch Tool."));
    }
    dispatch(setToolDetailLoading(false));
    return false;
  }
});
