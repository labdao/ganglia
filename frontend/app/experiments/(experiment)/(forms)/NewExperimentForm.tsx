"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePrivy } from "@privy-io/react-auth";
import { ChevronsUpDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addExperimentThunk, addExperimentWithCheckoutThunk, AppDispatch, experimentListThunk, refreshUserDataThunk, resetModelDetail, resetModelList, selectIsUserSubscribed, selectModelDetail, selectUserTier } from "@/lib/redux";
import { createExperiment } from "@/lib/redux/slices/experimentAddSlice/asyncActions";

import { DynamicArrayField } from "./DynamicArrayField";
import ThreeDMolViewer from "./ThreeDMolViewer";
import { generateDefaultValues, generateSchema } from "./formGenerator";
import { groupInputs, transformJson } from "./formUtils";

interface FormValues {
  name: string;
  model: string;
  pdbData?: string;            
  selectedResidues?: string[]; 
}

export default function NewExperimentForm({ task }: { task: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { user } = usePrivy();

  const model = useSelector(selectModelDetail);
  const walletAddress = user?.wallet?.address;
  const userTier = useSelector(selectUserTier);
  const isUserSubscribed = useSelector(selectIsUserSubscribed);
  const handleViewerSubmit = (data: { pdb: File | null; binderLength: number; hotspots: string }) => {
    console.log('Data from viewer:', data);
};

  useEffect(() => {
    dispatch(refreshUserDataThunk());
  }, [dispatch]);

  useEffect(() => {
    return () => {
      dispatch(resetModelDetail());
      dispatch(resetModelList());
    };
  }, [dispatch]);

  // Log model details whenever they change
  useEffect(() => {
    console.log("Updated model details:", model);
  }, [model]);

  const groupedInputs = groupInputs(model.ModelJson?.inputs);
  const formSchema = generateSchema(model.ModelJson?.inputs);
  // const defaultValues = generateDefaultValues(model.ModelJson?.inputs, task, model);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema), // Make sure formSchema reflects these types
    defaultValues: generateDefaultValues(model.ModelJson?.inputs, task, model),
});

  // Watch all form values
  const watchedValues = form.watch();

  // Log form values whenever they change
  useEffect(() => {
    console.log("Form values updated:", watchedValues);
  }, [watchedValues]);

  // If the model changes, fetch new model details
  useEffect(() => {
    form.reset(generateDefaultValues(model.ModelJson?.inputs, task, model));
  }, [model, form, task]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("===== Form Submitted =====", values);
  
    if (!walletAddress) {
      console.error("Wallet address missing");
      return;
    }
  
    const transformedPayload = transformJson(model, values, walletAddress);
    console.log("Submitting Payload:", transformedPayload);
  
    try {
      if (userTier === 'Free') {
        // For free tier users, directly create the experiment regardless of subscription status
        const response = await dispatch(addExperimentThunk(transformedPayload)).unwrap();
        if (response.redirectUrl) {
          router.push(response.redirectUrl);
        } else if (response && response.ID) {
          console.log("Experiment created", response);
          router.push(`/experiments/${response.ID}`, { scroll: false });
          dispatch(experimentListThunk(walletAddress));
          toast.success("Experiment started successfully");
        } else {
          console.log("Something went wrong", response);
          toast.error("Failed to start experiment");
        }
      } else if (userTier === 'Paid') {
        if (isUserSubscribed) {
          // Paid tier user with active subscription, directly create the experiment
          const response = await dispatch(addExperimentThunk(transformedPayload)).unwrap();
          if (response && response.ID) {
            console.log("Experiment created", response);
            router.push(`/experiments/${response.ID}`, { scroll: false });
            dispatch(experimentListThunk(walletAddress));
            toast.success("Experiment started successfully");
          } else {
            console.log("Something went wrong", response);
            toast.error("Failed to start experiment");
          }
        } else {
          // Paid tier user without active subscription, redirect to subscription page
          console.log('Redirecting...');
          router.push('/subscribe');
        }
      } else {
        console.error("Invalid user tier");
        toast.error("Unable to process request due to invalid user tier");
      }
      await dispatch(refreshUserDataThunk());
    } catch (error) {
      console.error("Failed to process experiment request", error);
      toast.error("Failed to process experiment request");
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          <Card className="mb-2">
            <CardContent>
              <div className="flex items-center gap-1">
                <div className="block w-3 h-3 border border-gray-300 rounded-full" />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grow">
                      <FormControl>
                        <Input variant="subtle" className="text-xl shrink-0 font-heading" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
            <ThreeDMolViewer onSubmit={handleViewerSubmit} />
            </CardContent>
          </Card>
          {!!groupedInputs?.standard && (
            <>
              <Card>
                {Object.keys(groupedInputs?.standard || {}).map((groupKey) => {
                  return (
                    <CardContent key={groupKey} className="">
                      <div className="space-y-4">
                        {Object.keys(groupedInputs?.standard[groupKey] || {}).map((key) => {
                          const input = groupedInputs?.standard?.[groupKey]?.[key];
                          return <DynamicArrayField key={key} inputKey={key} form={form} input={input} />;
                        })}
                      </div>
                    </CardContent>
                  );
                })}

                {Object.keys(groupedInputs?.collapsible || {}).map((groupKey) => {
                  return (
                    <CardContent key={groupKey} className="pt-0 first:pt-2">
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center w-full gap-2 text-sm text-left lowercase text-muted-foreground font-heading">
                          <ChevronsUpDownIcon />
                          {groupKey.replace("_", "")}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-0 space-y-4">
                            {Object.keys(groupedInputs?.collapsible[groupKey] || {}).map((key) => {
                              const input = groupedInputs?.collapsible?.[groupKey]?.[key];
                              return <DynamicArrayField key={key} inputKey={key} form={form} input={input} />;
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </CardContent>
                  );
                })}
                <CardContent>
                  <Button type="submit" className="flex-wrap w-full h-auto">
                    Start Experiment
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </form>
      </Form>
    </>
  );
}
